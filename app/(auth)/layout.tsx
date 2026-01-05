// General layout for authentication pages
// https://www.youtube.com/watch?v=gu4pafNCXng&t=15006s

import React from 'react'
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";

const Layout = async ({ children }:{ children : React.ReactNode })  => {
    const session = await auth.api.getSession({headers: await headers()});

    if (session?.user) redirect('/')
    return (
        <main className="min-h-screen flex items-center justify-center px-4 mt-4">
            <section className="w-full max-w-md scrollbar-hide-default">
                <h1 className="form-title">Welcome to Stock Researcher</h1>

                <div className="pb-6 lg:pb-8 w-full">{children}</div>
            </section>
        </main>
    )
}
export default Layout
