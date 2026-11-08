use anchor_lang::prelude::*;

declare_id!("E1fZero111111111111111111111111111111111111");

#[program]
pub mod elfzero_vault {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
