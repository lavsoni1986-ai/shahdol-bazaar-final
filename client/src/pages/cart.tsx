import { useLocation } from "wouter";
import { Cart } from "@/components/Cart";

export default function CartPage() {
  const [, setLocation] = useLocation();

  return (
    <Cart
      open={true}
      onOpenChange={(open) => {
        if (!open) setLocation("/");
      }}
    />
  );
}
