use anchor_lang::prelude::*;
use crate::state::{Vault, UserPosition};
use crate::errors::VaultError;

#[derive(Accounts)]
pub struct EmergencyExit<'info> {
    #[account(mut)]
    pub guardian: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"position", destination.key().as_ref()],
        bump = user_position.bump,
        has_one = guardian @ VaultError::UnauthorizedGuardian
    )]
    pub user_position: Account<'info, UserPosition>,

    /// CHECK: Non-custodial guarantee: strictly constrained to position owner
    #[account(
        mut,
        constraint = destination.key() == user_position.owner @ VaultError::UnauthorizedDestination
    )]
    pub destination: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EmergencyExit>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.user_position;

    let rescue_amount = position.amount;
    require!(rescue_amount > 0, VaultError::NoFundsToRescue);

    let min_rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
    let vault_lamports = **vault.to_account_info().lamports.borrow();
    require!(
        vault_lamports.saturating_sub(rescue_amount) >= min_rent,
        VaultError::RentViolation
    );

    // Drain user funds from vault back to the owner's destination wallet
    **vault.to_account_info().try_borrow_mut_lamports()? -= rescue_amount;
    **ctx.accounts.destination.try_borrow_mut_lamports()? += rescue_amount;

    position.amount = 0;
    vault.total_deposited = vault.total_deposited.saturating_sub(rescue_amount);

    msg!(
        "ElfZero GUARDIAN RESCUE: Safely returned {} lamports directly to owner {}",
        rescue_amount,
        ctx.accounts.destination.key()
    );
    Ok(())
}
