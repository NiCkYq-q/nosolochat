import { useState, type SubmitEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";

import { useAuth } from "../context/useAuth";



type AuthMode = "login" | "register";



export default function LoginPage() {

  const navigate = useNavigate();

  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");

  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {

    event.preventDefault();

    setError(null);

    setIsSubmitting(true);



    try {

      if (mode === "login") {

        await login(username, password);

      } else {

        await register(username, email, password);

      }

      void navigate("/", { replace: true });

    } catch (submitError) {

      const message =

        submitError instanceof ApiError ? submitError.message : "Не удалось выполнить запрос";

      setError(message);

    } finally {

      setIsSubmitting(false);

    }

  };



  return (

    <main className="auth-page">

      <section className="auth-card">

        <h1>NoSoloChat</h1>

        <p className="auth-subtitle">{mode === "login" ? "Вход" : "Регистрация"}</p>



        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>

          <label className="field">

            <span>Имя пользователя</span>

            <input

              type="text"

              name="username"

              autoComplete="username"

              value={username}

              onChange={(event) => {

                setUsername(event.target.value);

              }}

              required

            />

          </label>



          {mode === "register" && (

            <label className="field">

              <span>Email</span>

              <input

                type="email"

                name="email"

                autoComplete="email"

                value={email}

                onChange={(event) => {

                  setEmail(event.target.value);

                }}

                required

              />

            </label>

          )}



          <label className="field">

            <span>Пароль</span>

            <input

              type="password"

              name="password"

              autoComplete={mode === "login" ? "current-password" : "new-password"}

              value={password}

              onChange={(event) => {

                setPassword(event.target.value);

              }}

              required

            />

          </label>



          {error !== null && <p className="form-error">{error}</p>}



          <button type="submit" className="primary-button" disabled={isSubmitting}>

            {mode === "login" ? "Войти" : "Зарегистрироваться"}

          </button>

        </form>



        {mode === "login" && (

          <p className="auth-forgot">

            <Link to="/forgot-password" className="link-button">

              Забыли пароль?

            </Link>

          </p>

        )}



        <p className="auth-switch">

          {mode === "login" ? (

            <>

              Нет аккаунта?{" "}

              <button

                type="button"

                className="link-button"

                onClick={() => {

                  setMode("register");

                  setError(null);

                }}

              >

                Зарегистрироваться

              </button>

            </>

          ) : (

            <>

              Уже есть аккаунт?{" "}

              <button

                type="button"

                className="link-button"

                onClick={() => {

                  setMode("login");

                  setError(null);

                }}

              >

                Войти

              </button>

            </>

          )}

        </p>



      </section>

    </main>

  );

}

