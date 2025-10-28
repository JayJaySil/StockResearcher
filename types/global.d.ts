declare global {
    // Form payload for the sign-in page.
    type SignInFormData = {
        email: string;
        password: string;
    };

    // Quote snapshot returned from the SETSMART market data API.
    type SETSMARTStockQuote = {
        date: string;
        symbol: string;
        securityType: string;
        adjustedPriceFlag: string;
        prior: number;
        open: number;
        high: number;
        low: number;
        close: number;
        average: number;
        aomVolume: number;
        aomValue: number;
        trVolume: number;
        trValue: number;
        totalVolume: number;
        totalValue: number;
        pe: number;
        pbv: number;
        bvps: number;
        dividendYield: number;
        marketCap: number;
        volumeTurnover: number;
    };

    // Quarterly financial statement payload sourced from SETSMART.
    type SETSMARTFinancials = {
        symbol: string;
        year: number;
        quarter: number;
        dateAsof: string;
        financialStatementType: string;
        accountPeriod: string;

        // Balance sheet (THB thousands)
        totalAssets: number;
        totalLiabilities: number;
        shareholderEquity: number;
        paidupShareCapital: number;

        // P/L (quarter & accum)
        totalRevenueQuarter: number;
        totalRevenueAccum: number;
        ebitQuarter: number;
        ebitAccum: number;
        netProfitQuarter: number;
        netProfitAccum: number;
        epsQuarter: number; // Baht/share
        epsAccum: number;   // Baht/share

        // Cash flows (THB thousands, per quarter)
        operatingCashFlow: number;
        investingCashFlow: number;
        financingCashFlow: number;
    };

    // Form payload for user registration.
    type SignUpFormData = {
        name: string;
        email: string;
        password: string;
    };

    // Minimal company record stored in user lists.
    type CompanyItem = {
        id: string
        symbol: string
        name: string
        favorite?: boolean
    }

    // Props for reusable form inputs
    type FormInputProps = {
        name: string;
        label: string;
        placeholder: string;
        type?: string;
        register: UseFormRegister;
        error?: FieldError;
        validation?: RegisterOptions;
        disabled?: boolean;
        value?: string;
    };

    // Authenticated user profile persisted in session.
    type User = {
        id: string;
        name: string;
        email: string;
    };

    // data for a period
    type PeriodData = {
      columns: Column[];
      rows: any[]; 
    };
    
    type PeriodTableProps = {
      title: string;
      yearly: PeriodData;
      quarterly: PeriodData;
      initialPeriod?: "yearly" | "quarterly";
      className?: string;
      emptyStateText?: string;
    };

    // column type 
    type Column<TRow = any> = {
        key: string;             
        header: string;
        format?: (value: any, row: TRow) => React.ReactNode; 
    };

    type FooterLinkProps = {
        text: string;
        linkText: string;
        href: string;
    };

}

export {};
