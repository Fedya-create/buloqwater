import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;
    const hostname = request.headers.get("host") || "";

    const subdomain = getSubdomainFromHost(hostname);

    if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/") || pathname.startsWith("/api/auth") || pathname === "/manifest.json" || pathname.startsWith("/icon")) {
      if (subdomain && (pathname === "/" || pathname === "/register")) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role;

    if (pathname.startsWith("/superadmin")) {
      if (role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    if (pathname.startsWith("/admin")) {
      if (role !== "DIRECTOR" && role !== "SUPER_ADMIN") {
        return redirectToRoleHome(role as string, request.url);
      }
    }

    if (pathname.startsWith("/operator")) {
      if (role !== "OPERATOR" && role !== "DIRECTOR" && role !== "SUPER_ADMIN") {
        return redirectToRoleHome(role as string, request.url);
      }
    }

    if (pathname.startsWith("/driver")) {
      if (role !== "DRIVER" && role !== "DIRECTOR" && role !== "SUPER_ADMIN") {
        return redirectToRoleHome(role as string, request.url);
      }
    }

    if (subdomain && token.subdomain && subdomain !== token.subdomain) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!subdomain && token.subdomain && token.role !== "SUPER_ADMIN") {
      const tenantUrl = new URL(pathname, request.url);
      tenantUrl.hostname = `${token.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN || "buloqwater.uz"}`;
      return NextResponse.redirect(tenantUrl);
    }

    if (!subdomain && !token.subdomain && token.role !== "SUPER_ADMIN" && token.role !== "CUSTOMER") {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (
          pathname === "/" ||
          pathname === "/login" ||
          pathname === "/register" ||
          pathname.startsWith("/register/") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon") ||
          pathname === "/manifest.json"
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

function getSubdomainFromHost(hostname: string): string | null {
  const baseDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "buloqwater.uz";

  if (hostname.includes(".vercel.app")) return null;

  if (hostname.includes(baseDomain)) {
    const clean = hostname.replace(`:${process.env.PORT || "3000"}`, "");
    if (clean === baseDomain || clean === `www.${baseDomain}`) return null;
    const sub = clean.replace(`.${baseDomain}`, "");
    if (sub && sub !== clean) return sub;
  }

  if (hostname.includes(".localhost")) {
    return hostname.split(".")[0];
  }

  return null;
}

function redirectToRoleHome(role: string, baseUrl: string): NextResponse {
  const redirectMap: Record<string, string> = {
    SUPER_ADMIN: "/superadmin/dashboard",
    DIRECTOR: "/admin",
    OPERATOR: "/operator/orders",
    DRIVER: "/driver/tasks",
  };

  const path = redirectMap[role] || "/login";
  return NextResponse.redirect(new URL(path, baseUrl));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon|logo|public|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
