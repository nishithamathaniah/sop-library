/* Finance Handbook settings.
 *
 * Leave supabaseUrl empty to run in LOCAL mode: everything is saved in this
 * browser only, with demo data. Good for trying the app.
 *
 * Fill in both values to use the SHARED handbook (one handbook for the whole
 * team, real accounts). Find them in Supabase → Project Settings → API:
 *   supabaseUrl      "Project URL", e.g. https://abcdefgh.supabase.co
 *   supabaseAnonKey  the "anon" / "publishable" key. This key is meant to be
 *                    public: the access rules in supabase/schema.sql protect
 *                    the data. Never put the "service_role" / secret key here.
 */
window.SOP_CONFIG = {
  supabaseUrl: 'https://arkvawlxevnwarpfstfx.supabase.co',
  supabaseAnonKey: 'sb_publishable_c0Juxd4wtYE7eHdMz2M0mA_eX22XlFj',
  appName: 'Finance Handbook',      // shown in the menu and on the sign-in page
  orgName: "The Father's House",    // used when the logo is turned off
  orgLogo: true,                    // show The Father's House logo (js/logo.js)
  googleSignIn: false,              // turn on after setting up Google in Supabase (docs/SETUP.md, step 2a)
};
