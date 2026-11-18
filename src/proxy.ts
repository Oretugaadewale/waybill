import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before /admin routes:
 *  - refreshes the Supabase session cookie so it never silently expires,
 *  - sends signed-out visitors to the login page.
 * Whether the user is actually an admin is checked again on the server,
 * against the database, before any admin data is shown.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() verifies the JWT, unlike getSession().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const onLoginPage = pathname === "/admin/login";

  if (!signedIn && !onLoginPage) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  if (signedIn && onLoginPage) {
    const admin = request.nextUrl.clone();
    admin.pathname = "/admin";
    admin.search = "";
    return NextResponse.redirect(admin);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
