// Header renders the global app header with brand and user actions.
import React from 'react'
import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";

const Header = ({user} : {user : User}) => {
    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/">
                    <h1 className="text-2xl font-bold text-white cursor-pointer">Stock Researcher</h1> 
                </Link>
                <UserDropdown user={user} />
            </div>
        </header>
    )
}
export default Header
