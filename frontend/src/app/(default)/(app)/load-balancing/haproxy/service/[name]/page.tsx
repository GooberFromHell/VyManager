import { HAProxyServiceDetail } from "@/components/load-balancing/HAProxyServiceDetail";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function HAProxyServicePage({ params }: Props) {
  const { name } = await params;
  return (
      <HAProxyServiceDetail serviceName={decodeURIComponent(name)} />
  );
}
