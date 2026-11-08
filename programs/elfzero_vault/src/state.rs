use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub guardian: Pubkey,
    pub total_deposited: u64,
    pub bump: u8,
}

impl Vault {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub guardian: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}
