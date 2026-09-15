import { getPortfolio } from "@/lib/api";
import PortfolioSite from "@/components/PortfolioSite";

export default async function Home() {
  const portfolio = await getPortfolio();
  if (!portfolio) {
    return <main className="offline"><p>Portfolio API is not available yet.</p><p className="muted">Start the Express server and seed MongoDB, then refresh.</p></main>;
  }
  return <PortfolioSite data={portfolio} />;
}
