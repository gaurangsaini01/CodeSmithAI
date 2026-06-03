import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignupMutation } from "../services/authApi";
const zodSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email(),
    password: z.string().min(6, "Minimum 6 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
type FormValues = z.infer<typeof zodSchema>;
export default function SignupPage() {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();
  const [formError, setFormError] = useState("");
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
    resolver: zodResolver(zodSchema),
    mode: "onTouched",
  });
  async function onSubmit(values: FormValues) {
    setFormError("");
    try {
      await signup(values).unwrap();
      navigate("/login");
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      setFormError(detail ?? "Signup failed. Please try again.");
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Sign up to start chatting"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-violet-600 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        <TextField
          id="name"
          label="Name"
          placeholder="Enter Name"
          {...register("name")}
          error={errors.name?.message}
        />
        <TextField
          id="email"
          label="Email"
          {...register("email")}
          placeholder="you@example.com"
          error={errors.email?.message}
        />
        <TextField
          id="password"
          label="Password"
          type="Password"
          {...register("password")}
          placeholder="At least 6 characters"
          error={errors.password?.message}
        />
        <TextField
          id="confirm"
          label="Confirm password"
          type="Password"
          {...register("confirm_password")}
          placeholder="Re-enter password"
          error={errors.confirm_password?.message}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing up..." : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}
