// CompanyHeader renders the app header for company-focused pages with nav and user menu.
import React from 'react'
import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";

const CompanyHeader = ({user} : {user : User}) => {
    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/">
                    <h1 className="text-2xl font-bold text-white cursor-pointer">Stock Researcher</h1> 
                </Link>
                <nav className="hidden sm:block">
                    <NavItems />
                </nav>
                <UserDropdown user={user} />
            </div>
        </header>
    )
}
export default CompanyHeader
