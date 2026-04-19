import { chromium } from "playwright";

const base = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
const adminEmail = process.env.ADMIN_SMOKE_EMAIL || "";
const adminPassword = process.env.ADMIN_SMOKE_PASSWORD || "";
const affiliateEmail = process.env.AFFILIATE_SMOKE_EMAIL || "";
const affiliatePassword = process.env.AFFILIATE_SMOKE_PASSWORD || "";

function mark(name, pass, details = {}, required = true) {
  return { name, pass, required, ...details };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];

  async function loginThroughUi(page, email, password) {
    await page.goto(`${base}/auth/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
  }

  try {
    const page = await browser.newPage();

    await page.goto(`${base}/auth/login`, { waitUntil: "networkidle" });
    const loginText = (await page.textContent("body")) || "";
    checks.push(
      mark("login page has sign in", /sign in/i.test(loginText)),
      mark("login page has forgot password", /forgot password/i.test(loginText)),
      mark("login page has google marker", /google|continue with|loading google sign-in/i.test(loginText), {
        note: "Marker may be absent when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.",
      }, false),
    );

    await page.goto(`${base}/products`, { waitUntil: "networkidle" });
    const productsText = (await page.textContent("body")) || "";
    checks.push(mark("products page renders", /products/i.test(productsText)));

    await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
    const checkoutText = (await page.textContent("body")) || "";
    checks.push(mark("checkout page renders", /checkout/i.test(checkoutText)));

    await page.goto(`${base}/account/orders`, { waitUntil: "networkidle" });
    await page.waitForURL(/\/auth\/login/, { timeout: 7000 }).catch(() => {});
    const noAuthUrl = page.url();
    checks.push(
      mark("orders redirects to login when logged out", noAuthUrl.includes("/auth/login"), {
        url: noAuthUrl,
      }),
    );

    await page.goto(`${base}/admin/dashboard`, { waitUntil: "networkidle" });
    await page.waitForURL(/\/auth\/login/, { timeout: 7000 }).catch(() => {});
    checks.push(
      mark("admin redirects to login when logged out", page.url().includes("/auth/login"), {
        url: page.url(),
      }),
    );

    const authContext = await browser.newContext({ baseURL: base });
    const request = authContext.request;
    const email = `pw${Math.floor(Math.random() * 1000000)}@example.com`;

    const register = await request.post("/api/v1/auth/register", {
      data: { name: "Playwright Smoke", email, password: "pass123" },
    });

    checks.push(mark("register through frontend proxy", register.ok(), { status: register.status(), email }));

    const authPage = await authContext.newPage();
    await authPage.goto("/account/orders", { waitUntil: "networkidle" });
    const authOrdersText = (await authPage.textContent("body")) || "";
    checks.push(
      mark("orders page renders when authenticated", /my orders|orders/i.test(authOrdersText), {
        url: authPage.url(),
      }),
    );

    await authPage.goto("/products", { waitUntil: "networkidle" });
    const productLinks = await authPage.$$eval('a[href*="/products/"]', (els) =>
      els.map((a) => a.getAttribute("href")).filter(Boolean),
    );

    if (productLinks.length > 0) {
      const href = productLinks[0].startsWith("http") ? productLinks[0] : `${base}${productLinks[0]}`;
      await authPage.goto(href, { waitUntil: "networkidle" });
      const detailText = (await authPage.textContent("body")) || "";
      checks.push(mark("product detail page includes purchase action", /add to cart|buy now|order/i.test(detailText), { url: authPage.url() }));
    } else {
      checks.push(mark("product detail page includes purchase action", false, { note: "No product detail links found on products page." }, false));
    }

    if (adminEmail && adminPassword) {
      const adminContext = await browser.newContext({ baseURL: base });
      const adminPage = await adminContext.newPage();
      await loginThroughUi(adminPage, adminEmail, adminPassword);
      await adminPage.goto(`${base}/admin/dashboard`, { waitUntil: "networkidle" });
      const adminText = (await adminPage.textContent("body")) || "";
      checks.push(
        mark("admin dashboard renders for admin fixture", /dashboard|admin panel/i.test(adminText), {
          url: adminPage.url(),
        }),
      );
      await adminContext.close();
    } else {
      checks.push(
        mark(
          "admin fixture credentials configured",
          false,
          { note: "Set ADMIN_SMOKE_EMAIL and ADMIN_SMOKE_PASSWORD to enable authenticated admin checks." },
          false,
        ),
      );
    }

    if (affiliateEmail && affiliatePassword) {
      const affiliateContext = await browser.newContext({ baseURL: base });
      const affiliatePage = await affiliateContext.newPage();
      await loginThroughUi(affiliatePage, affiliateEmail, affiliatePassword);
      await affiliatePage.goto(`${base}/affiliate/dashboard`, { waitUntil: "networkidle" });
      const affiliateText = (await affiliatePage.textContent("body")) || "";
      checks.push(
        mark("affiliate dashboard renders for fixture", /affiliate dashboard|affiliate code|wallet/i.test(affiliateText), {
          url: affiliatePage.url(),
        }),
      );
      await affiliateContext.close();
    } else {
      checks.push(
        mark(
          "affiliate fixture credentials configured",
          false,
          { note: "Set AFFILIATE_SMOKE_EMAIL and AFFILIATE_SMOKE_PASSWORD to enable authenticated affiliate checks." },
          false,
        ),
      );
    }

    const failedRequired = checks.filter((c) => c.required && !c.pass);
    const failedOptional = checks.filter((c) => !c.required && !c.pass);
    console.log(JSON.stringify({ base, checks, failedRequiredCount: failedRequired.length, failedOptionalCount: failedOptional.length }, null, 2));

    if (failedRequired.length > 0) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
})();
