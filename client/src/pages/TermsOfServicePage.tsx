export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm">
        <h1 className="font-heading font-bold text-3xl mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using The Crunch Era website, you agree to be
              bound by these Terms of Service. If you do not agree, please do
              not use this site.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">2. Products and Pricing</h2>
            <p>
              All product prices are listed in Indian Rupees (₹) and are
              subject to change without prior notice. We make reasonable
              efforts to ensure product descriptions and images are accurate,
              but we do not warrant that they are error-free.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">3. Orders and Payment</h2>
            <p>
              All orders are subject to acceptance and availability. Payment
              is processed securely through Razorpay at the time of order
              placement. We reserve the right to cancel any order at our
              discretion, including in cases of suspected fraud or pricing
              errors, in which case a full refund will be issued.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">4. Shipping</h2>
            <p>
              Orders are shipped via our courier partners through Shiprocket.
              Delivery timelines are estimates and not guaranteed. We are not
              responsible for delays caused by courier partners, weather, or
              circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">5. Returns and Refunds</h2>
            <p>
              As our products are food items, we generally do not accept
              returns once delivered, except in cases of damaged, defective,
              or incorrect items received. Please contact us within 48 hours
              of delivery with photo evidence for such issues, and we will
              arrange a replacement or refund at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">6. Account and Sign-In</h2>
            <p>
              You may sign in using your Google account to place orders and
              view order history. You are responsible for maintaining the
              confidentiality of your account access.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">7. Limitation of Liability</h2>
            <p>
              The Crunch Era shall not be liable for any indirect, incidental,
              or consequential damages arising from your use of this website
              or its products, to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">8. Governing Law</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes
              shall be subject to the jurisdiction of the courts in Jaipur,
              Rajasthan.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of
              the site after changes constitutes acceptance of the updated
              Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-lg mb-2">10. Contact Us</h2>
            <p>
              For any questions about these Terms, please reach out via our{" "}
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
