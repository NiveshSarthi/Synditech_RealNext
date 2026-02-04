import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardRedirect() {
    const router = useRouter();

    const { user } = useAuth(); // Need user context to decide redirect

    useEffect(() => {
        if (!user) return; // Wait for user to be loaded

        if (user.is_super_admin) {
            router.replace('/admin');
        } else if (user.context?.partner) {
            router.replace('/partner');
        } else {
            router.replace('/analytics');
        }
    }, [router, user]);

    return (
        <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
}
