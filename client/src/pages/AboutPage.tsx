import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Heart, Users, Leaf, TrendingUp } from "lucide-react";
import founderImage from "@assets/generated_images/Family_preparing_healthy_food_7c83a44c.png";
import ingredientsImage from "@assets/generated_images/Fresh_fruits_and_vegetables_closeup_56783cc8.png";

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="font-heading font-bold text-5xl md:text-6xl mb-4" data-testid="text-about-title">
            Our Story
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforming kids' nutrition, one delicious bite at a time
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="font-heading font-bold text-4xl mb-6" data-testid="text-founder-title">
                From Parents, For Parents
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  TroovyBites was born from a simple frustration: why is it so hard to find healthy food that kids actually want to eat?
                </p>
                <p>
                  As parents ourselves, we were tired of choosing between nutritious ingredients and food our children would actually enjoy. The grocery store aisles were filled with either ultra-processed junk food marketed to kids, or healthy options that ended up in the trash.
                </p>
                <p>
                  So we decided to create something different. We spent months in our own kitchens, testing recipes with our kids and their friends. We learned that children don't need artificial flavors and loads of sugar—they just need food that tastes good and feels fun.
                </p>
                <p className="font-medium text-foreground">
                  Today, TroovyBites brings that mission to thousands of families, making healthy eating something kids look forward to.
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img
                src={founderImage}
                alt="Family preparing healthy food together"
                className="rounded-2xl w-full h-auto shadow-lg"
              />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-4xl mb-4">
              Our Mission & Values
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Guided by principles that put families first
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-8 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-3">
                Family First
              </h3>
              <p className="text-muted-foreground">
                Every decision we make is about supporting healthy, happy families
              </p>
            </Card>

            <Card className="p-8 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-3">
                Pure Ingredients
              </h3>
              <p className="text-muted-foreground">
                Only real, whole foods—nothing artificial, ever
              </p>
            </Card>

            <Card className="p-8 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-3">
                Kid-Tested
              </h3>
              <p className="text-muted-foreground">
                Real kids taste-test every product before it reaches your home
              </p>
            </Card>

            <Card className="p-8 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-3">
                Transparency
              </h3>
              <p className="text-muted-foreground">
                We're open about every ingredient, process, and sourcing decision
              </p>
            </Card>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={ingredientsImage}
                alt="Fresh organic fruits and vegetables"
                className="rounded-2xl w-full h-auto shadow-lg"
              />
            </div>
            <div>
              <h2 className="font-heading font-bold text-4xl mb-6" data-testid="text-sustainability-title">
                Sustainable Sourcing
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  We believe great food starts with great ingredients. That's why we partner directly with organic farms and sustainable suppliers who share our commitment to quality and environmental responsibility.
                </p>
                <p>
                  Our ingredients are:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Sourced from certified organic farms whenever possible</li>
                  <li>Non-GMO and free from synthetic pesticides</li>
                  <li>Traceable from farm to your family's table</li>
                  <li>Packaged in recyclable or compostable materials</li>
                </ul>
                <p className="font-medium text-foreground">
                  When you choose TroovyBites, you're supporting sustainable agriculture and a healthier planet for our children's future.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
