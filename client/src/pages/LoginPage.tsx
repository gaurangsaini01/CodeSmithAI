import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { setUser } from "../store/authSlice";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "../services/authApi";

const zodSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Minimum 6 characters"),
});
type FormValues = z.infer<typeof zodSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [login, { isLoading }] = useLoginMutation();
  const [formError, setFormError] = useState("");
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(zodSchema),
    mode: "onTouched",
  });

  async function onSubmit(values: FormValues) {
    setFormError("");
    try {
      const user = await login(values).unwrap();
      dispatch(setUser(user));
      navigate("/");
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      setFormError(detail ?? "Login failed. Please try again.");
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your chats"
      footer={
        <>
          No account yet?{" "}
          <Link
            to="/signup"
            className="font-medium text-violet-600 hover:underline"
          >
            Sign up
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
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
