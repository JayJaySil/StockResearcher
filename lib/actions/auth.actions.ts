// Server actions for authentication (sign up/in/out) via Better Auth.
'use server';
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";


// Sign a user up with email/password
export const signUpWithEmail = async ({email, password, name}: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: { email, password, name },
        })

        return {success: true, data: response};
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: 'Sign up failed' };
    }
}

// Sign the current session out.
export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers()});
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' };
    }
}

// Sign a user in with email/password.
export const signInWithEmail = async ({email, password}: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            body: { email, password },
        })

        return {success: true, data: response};
    } catch (e) {
        console.log('Sign in failed', e)
        return { success: false, error: 'Sign in failed' };
    }
}
