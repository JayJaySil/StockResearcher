//https://www.youtube.com/watch?v=gu4pafNCXng

// Server actions for authentication using betterauth.
'use server';
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";


// Sign up using email and password
export const signUpWithEmail = async ({email, password, name}: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: { email, password, name },
        })

        return {success: true, data: response};
    } catch (error) {
        console.log('Sign up failed', error)
        return { success: false, error: 'Sign up failed' };
    }
}

// Signout the user
export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers()});
    } catch (error) {
        console.log('Sign out failed', error)
        return { success: false, error: 'Sign out failed' };
    }
}

// Signin using email and password
export const signInWithEmail = async ({email, password}: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            body: { email, password },
        })

        return {success: true, data: response};
    } catch (error) {
        console.log('Sign in failed', error)
        return { success: false, error: 'Sign in failed' };
    }
}
