import { createContext, useContext, useState, useMemo, FC, ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { Role, RoleInfo } from "../types";

// Import Wallet Adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export const PRECONFIGURED_ROLES: Record<Role, RoleInfo> = {
  USER: {
    role: "USER",
    name: "Depositor (Demo User)",
    address: "5RL7Z7qJb4LDwQi5xoaXDsr93oK8MnRPVidBb3opRuNc",
    description: "Depositor with collateral locked in the vault.",
  },
  GUARDIAN: {
    role: "GUARDIAN",
    name: "Autonomous Guardian Agent",
    address: "5EwpC6npjFbHtyHXtfVdsagTmJmwWzgh53EL66wagNod",
    description: "Security agent authorized to trigger emergency exits.",
  },
  AUTHORITY: {
    role: "AUTHORITY",
    name: "Upgrade Authority",
    address: "38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU",
    description: "Protocol admin with program upgrade permissions.",
  },
};

interface RoleContextType {
  activeRole: Role;
  roleInfo: RoleInfo;
  setActiveRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  activeRole: "GUARDIAN",
  roleInfo: PRECONFIGURED_ROLES.GUARDIAN,
  setActiveRole: () => {},
});

export const useRole = () => useContext(RoleContext);

interface AppWalletProviderProps {
  children: ReactNode;
}

export const AppWalletProvider: FC<AppWalletProviderProps> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<Role>("GUARDIAN");

  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  const wallets = useMemo(() => [], []);

  const roleValue = useMemo(
    () => ({
      activeRole,
      roleInfo: PRECONFIGURED_ROLES[activeRole],
      setActiveRole,
    }),
    [activeRole]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <RoleContext.Provider value={roleValue}>
            {children}
          </RoleContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
