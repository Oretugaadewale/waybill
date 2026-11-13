export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          Built by{" "}
          <a
            className="font-medium text-ink underline underline-offset-4"
            href="https://adewale-oretuga.netlify.app"
          >
            Adewale Oretuga
          </a>
          , inspired by running operations at eShopAfrica.
        </p>
        <p>
          <a
            className="font-medium text-ink underline underline-offset-4"
            href="https://github.com/Oretugaadewale/waybill"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
