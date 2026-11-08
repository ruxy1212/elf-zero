use anchor_lang::prelude::*;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = Vault::LEN,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, authority: Pubkey, guardian: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.authority = authority;
    vault.guardian = guardian;
    vault.total_deposited = 0;
    vault.bump = ctx.bumps.vault;

    msg!("ElfZero Vault initialized. Authority: {}, Guardian: {}", authority, guardian);
    Ok(())
}
