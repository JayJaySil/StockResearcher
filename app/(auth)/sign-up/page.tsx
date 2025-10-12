import React from 'react'
import {useForm} from "react-hook-form"
const SignUp = () => {
    const {
        register,
        handleSubmit,
        control,
        formState: {errors, isSubmitting},
    } = useForm<SignUpFormData>()
    const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)
    return (
        <>
            <h1 className="form-title">Sign Up & Personalize</h1>
        </>
    )
}
export default SignUp
