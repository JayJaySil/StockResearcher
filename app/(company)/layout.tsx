// Generallayout for company pages. Gets the user session and render the company header.

import React from 'react'
import CompanyHeader from "@/components/CompanyHeader"
import {auth} from "@/lib/better-auth/auth"
import {headers} from "next/headers"
import {redirect} from "next/navigation"

const Layout = async ({ children }:{ children : React.ReactNode })  => {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if(!session?.user) redirect('/sign-in')

    const user = {
        id:session.user.id,
        name: session.user.name,
        email:session.user.email,
    }

    return (
        <main className="min-h-screen text-gray-400">
            <CompanyHeader user={user} />

            <div className="container py-10">
                {children}
            </div>
        </main>
    )
}
export default Layout
