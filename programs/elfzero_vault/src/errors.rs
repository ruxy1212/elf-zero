use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Signer is not authorized to act as authority")]
    UnauthorizedAuthority,

    #[msg("Signer is not authorized as guardian for this position")]
    UnauthorizedGuardian,

    #[msg("Signer is not the authorized depositor")]
    UnauthorizedDepositor,

    #[msg("Emergency exit destination must match user position owner")]
    UnauthorizedDestination,

    #[msg("Insufficient balance in user position")]
    InsufficientFunds,

    #[msg("No funds available to rescue for this position")]
    NoFundsToRescue,

    #[msg("Operation would violate vault minimum rent exemption floor")]
    RentViolation,

    #[msg("Math calculation overflow")]
    MathOverflow,
}
