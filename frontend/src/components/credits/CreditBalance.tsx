import { FaWallet } from 'react-icons/fa6';

interface CreditBalanceProps {
    balance: number;
    className?: string;
}

export const CreditBalance = ({ balance, className }: CreditBalanceProps) => (
    <div className={`relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group ${className || ''}`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 rounded-full -translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FaWallet className="text-xl text-blue-600" />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Balance</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{balance.toLocaleString()}</p>
            </div>
        </div>
    </div>
);
