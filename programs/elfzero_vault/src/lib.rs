use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT");

#[program]
pub mod elfzero_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey, guardian: Pubkey) -> Result<()> {
        instructions::initialize::handler(ctx, authority, guardian)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn emergency_exit(ctx: Context<EmergencyExit>) -> Result<()> {
        instructions::emergency_exit::handler(ctx)
    }
}
