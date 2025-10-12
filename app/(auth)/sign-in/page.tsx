'use client'
import React from 'react'
import { useForm } from "react-hook-form";
import {Button} from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";

const SignIn = () => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        }, mode: 'onBlur'
    })
    const onSubmit = async (data: SignInFormData) => {
        try {
            console.log(data)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            <h1 className="form-title">Log In Your Account</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/*    INPUTS*/}
                <InputField
                    name="email"
                    label="Email"
                    placeholder="example@gmail.com"
                    register={register}
                    error={errors.email}
                    validation={{ required: 'Email is required', pattern: /^\w+@\w+$/, message: 'Email address is required' }}
                />
                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Full name is required', minLength: 8}}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Logging In' : 'Log In'}
                </Button>

                <FooterLink text="Dont have an account?" linkText="Sign up" href="/sign-up" />
            </form>
        </>
    )
}
export default SignIn
