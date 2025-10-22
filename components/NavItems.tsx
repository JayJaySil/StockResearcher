'use client'
// gets access to browser functionalities eg, path
import React from 'react'
import Link from "next/link";
import {usePathname, useSearchParams} from "next/navigation";

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Company Dashboard' },
    { href: '/financial', label: 'Financial Data' },
    { href: '/summariser', label: '56-1 Summariser' }
];


const NavItems = () => {
    const pathname:string = usePathname()
    const searchParams = useSearchParams()

    const isActive = (path: string) => {
        if (path == '/') return pathname == '/';

        return pathname.startsWith(path)
    }

    // Build URL with current search params
    const buildUrl = (href: string) => {
        const params = searchParams.toString()
        return params ? `${href}?${params}` : href
    }

    return (
        <ul className="flex flex-col sm:flex-row p-2 gap-3 sm:gap-10 font-medium">
            {NAV_ITEMS.map(({ href, label }) => (
                <li key={href}>
                    <Link href={buildUrl(href)} className={`hover:text-yellow-500 transition-colors ${
                        isActive(href) ? 'text-gray-100' : ''
                    }`}>
                        {label}
                    </Link>
                </li>
            ))}
        </ul>
    )
}
export default NavItems
