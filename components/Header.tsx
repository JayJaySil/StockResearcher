import React from 'react'
import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";

const Header = ({user} : {user : User}) => {
    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <h1 className="text-2xl font-bold text-white">Stock Researcher</h1>
                <nav className="hidden sm:block">
                </nav>
                <UserDropdown user={user} />
            </div>
        </header>
    )
}
export default Header
