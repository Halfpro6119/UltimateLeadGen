# Making Auto Website Builder URLs Public

By default, Vercel protects **preview** deployments (including the `*.vercel.app` aliases this app assigns) so only you or your team can view them. To let **anyone on the internet** open those URLs:

## Option 1: Disable protection for this project’s previews (simplest)

1. Open the [Vercel Dashboard](https://vercel.com/dashboard) and select the **project** you use for the website builder (the one set in `VERCEL_PROJECT_ID`).
2. Go to **Settings** → **Deployment Protection**.
3. Under **Preview Deployments**, set protection to **None** (or the option that makes previews public in your plan).
   - If you don’t see “None”, check your plan: **Enterprise** can use “Only production deployments” so previews stay public; other plans may need Option 2.

After this, all existing and future builder URLs (e.g. `americanpestcontrol.vercel.app`) will be publicly accessible.

## Option 2: Deployment Protection Exceptions (per domain)

If you want to keep protection on other previews and only make **specific** builder URLs public:

1. In the same project, go to **Settings** → **Deployment Protection**.
2. Find **Deployment Protection Exceptions** (or “Unprotected domains”).
3. Click **Add domain** and enter the alias you want public (e.g. `americanpestcontrol.vercel.app`).
4. Confirm as prompted (e.g. re-enter the domain and type “unprotect my domain”).

Repeat for each `{business}.vercel.app` URL you want public. This feature may require a **Pro** plan and/or the **Advanced Deployment Protection** add-on.

---

After either option, the URLs from the Auto Website Creator will be viewable by anyone with the link.
