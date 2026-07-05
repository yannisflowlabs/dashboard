import Sidebar from "@/components/layout/Sidebar";
import CallReviewBanner from "@/components/ui/CallReviewBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Sidebar />
      <main
        className="app-gradient-bg"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
      <CallReviewBanner />
    </div>
  );
}
