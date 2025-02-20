use anchor_lang::prelude::*;

declare_id!("Dfy3ZqRoiNyfi3YCU3SiQRjFtjMderffymz8vg2NQLAC");

#[program]
pub mod game_multisig_vault {
    use super::*;
    pub fn create_vault(ctx: Context<CreateVault>, id: u64, count: u64) -> Result<()> {
        ctx.accounts.vault.id = id;
        ctx.accounts.vault.count = count;
        if count == 0 || count > 8 || count as usize != ctx.remaining_accounts.len() {
            return Err(CustomError::WrongAmountOfSigners.into());
        }
        for i in 0..count {
            ctx.accounts.vault.signers[i as usize] = ctx.remaining_accounts[i as usize].key();
        }
        Ok(())
    }
    pub fn rotate_signers(ctx: Context<RotateSigners>, id: u64, new_count: u64) -> Result<()> {
        if ctx.remaining_accounts.len() != (ctx.accounts.vault.count + new_count) as usize {
            return Err(CustomError::WrongAmountOfSigners.into());
        }
        for i in 0..ctx.accounts.vault.count {
            if ctx.remaining_accounts[i as usize].is_signer != true {
                return Err(CustomError::MissingSignature.into());
            }
            if ctx.remaining_accounts[i as usize].key() != ctx.accounts.vault.signers[i as usize] {
                return Err(CustomError::WrongSigner.into());
            }
        }
        ctx.accounts.vault.signers = [Pubkey::default(); 8];
        for i in 0..new_count {
            let ii = (ctx.accounts.vault.count + i) as usize;
            ctx.accounts.vault.signers[i as usize] = ctx.remaining_accounts[ii as usize].key();
        }
        ctx.accounts.vault.count = new_count as u64;
        Ok(())
    }
    pub fn deposit(ctx: Context<Deposit>, id: u64, lamports: u64) -> Result<()> {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.vault_wallet.to_account_info(),
                },
            ),
            lamports,
        )?;
        ctx.accounts.vault.balance += lamports;
        ctx.accounts.deposit_account.amount += lamports;
        ctx.accounts.deposit_account.owner = ctx.accounts.signer.key();
        ctx.accounts.deposit_account.vault = ctx.accounts.vault.key();
        Ok(())
    }
    pub fn withdraw(ctx: Context<Withdraw>, id: u64, lamports: u64) -> Result<()> {
        if lamports > ctx.accounts.vault.balance {
            return Err(CustomError::NotEnoughSol.into());
        }
        for i in 0..ctx.accounts.vault.count {
            if !ctx.remaining_accounts[i as usize].is_signer {
                return Err(CustomError::MissingSignature.into());
            }
            if ctx.accounts.vault.signers[i as usize] != ctx.remaining_accounts[i as usize].key() {
                return Err(CustomError::WrongSigner.into());
            }
        }
        ctx.accounts.vault.balance -= lamports;
        **ctx.accounts.vault_wallet.try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.to.try_borrow_mut_lamports()? += lamports;
        Ok(())
    }
}
#[error_code]
pub enum CustomError {
    #[msg("Wrong amount of signers")]
    WrongAmountOfSigners,
    #[msg("Missing Signature")]
    MissingSignature,
    #[msg("Wrong Signer")]
    WrongSigner,
    #[msg("Not Enough Sol")]
    NotEnoughSol,
}
#[account]
pub struct Vault {
    pub id: u64,
    pub signers: [Pubkey; 8],
    pub count: u64,
    pub balance: u64,
}
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 8 + 32 * 8 + 8 + 8,
        payer = payer,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        seeds = [b"wallet", vault.key().as_ref()],
        bump,
        payer = payer,
        space = 8,
    )]
    /// CHECK: 
    pub vault_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct RotateSigners<'info> {
    #[account(
        mut,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
}
#[account]
pub struct DepositAccount {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
}
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init_if_needed,
        seeds = [b"deposit", signer.key().as_ref(), vault.key().as_ref()],
        bump,
        payer = signer,
        space = 8 + 32 + 32 + 8
    )]
    pub deposit_account: Account<'info, DepositAccount>,
    #[account(
        mut,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [b"wallet", vault.key().as_ref()],
        bump,
    )]
    /// CHECK: 
    pub vault_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub to: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds =[b"wallet", vault.key().as_ref()],
        bump,
    )]
    /// CHECK: 
    pub vault_wallet: AccountInfo<'info>,
}
/*
solana program deploy --skip-fee-check ./program.so --with-compute-unit-price 100 --use-rpc --max-sign-attempts 1000
solana program deploy --skip-fee-check ./target/deploy/ogc_reserve.so  --with-compute-unit-price 100 --use-rpc --max-sign-attempts 1000 --keypair /home/xeony/.config/solana/id.json
*/
