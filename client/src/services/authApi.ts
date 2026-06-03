import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthUser } from "../store/authSlice";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type SignupBody = {
  name: string;
  email: string;
  password: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  endpoints: (builder) => ({
    signup: builder.mutation<AuthUser, SignupBody>({
      query: (body) => ({ url: "/signup", method: "POST", body }),
    }),

    login: builder.mutation<AuthUser, LoginBody>({
      query: (body) => ({ url: "/login", method: "POST", body }),
    }),
  }),
});

export const { useSignupMutation, useLoginMutation } = authApi;
