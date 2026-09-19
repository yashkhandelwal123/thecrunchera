export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm">
        <h1 className="font-heading font-bold text-3xl mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">1. Information We Collect</h2>
            <p>
              When you sign in with Google, we collect your name, email address,
              and profile photo. When you place an order, we additionally collect
              your shipping address and phone number. We do not collect or store
              your card, UPI, or bank details — all payments are processed
              directly by Razorpay, our payment gateway partner.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to process and ship your orders, send
              order confirmations and updates, respond to inquiries you submit
              through our contact form, and — only if you subscribe — send
              occasional newsletter emails. We do not sell or rent your personal
              information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">3. Third-Party Services</h2>
            <p>
              We share necessary order information with trusted service
              providers to fulfill your order: Razorpay (payment processing),
              Shiprocket (shipping and courier services), and Google (sign-in
              authentication). Each of these providers has its own privacy
              policy governing how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">4. Data Security</h2>
            <p>
              We take reasonable technical measures to protect your personal
              information, including encrypted connections (HTTPS) and secure
              session handling. However, no method of transmission over the
              internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">5. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data by contacting us at{" "}
              <a href="mailto:khandelwalyash6185@gmail.com" className="text-primary hover:underline">
                khandelwalyash6185@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">6. Cookies</h2>
            <p>
              We use a session cookie to keep you signed in. This cookie is
              essential for the site to function (e.g., to let you check out)
              and does not track you across other websites.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Continued
              use of the site after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us via our{" "}
              <a href="/contact" className="text-primary hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
