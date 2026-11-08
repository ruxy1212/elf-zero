use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{Vault, UserPosition};
use crate::errors::VaultError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [b"position", user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, VaultError::InsufficientFunds);

    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.user_position;

    // Anchor 1.x CPI to System Program transfer
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: vault.to_account_info(),
        },
    );
    transfer(cpi_ctx, amount)?;

    // Initialize position metadata on first deposit
    if position.amount == 0 {
        position.owner = ctx.accounts.user.key();
        position.guardian = vault.guardian;
        position.bump = ctx.bumps.user_position;
    }

    position.amount = position
        .amount
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;

    vault.total_deposited = vault
        .total_deposited
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;

    msg!(
        "ElfZero Deposit: User {} deposited {} lamports (Total Position: {})",
        ctx.accounts.user.key(),
        amount,
        position.amount
    );
    Ok(())
}
