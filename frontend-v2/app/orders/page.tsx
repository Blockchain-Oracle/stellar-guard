'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Loader2, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { isWalletConnected, getPublicKey } from "@/lib/stellar";
import { getUserOrders, cancelOrder, StopLossOrder, OrderType } from "@/services/stop-loss";
import { getCurrentPrice } from "@/services/oracle";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [orders, setOrders] = useState<StopLossOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState<{ [key: string]: number }>({});

  const fetchOrders = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      if (!isWalletConnected()) {
        toast.error("Please connect your wallet to view orders");
        return;
      }

      const userAddress = await getPublicKey();
      console.log('Fetching orders for:', userAddress);
      
      const userOrders = await getUserOrders(userAddress);
      console.log('Orders fetched:', userOrders);
      setOrders(userOrders);

      // Fetch current prices for all unique assets
      const uniqueAssets = [...new Set(userOrders.map(o => o.asset))];
      const pricePromises = uniqueAssets.map(async (asset) => {
        try {
          const price = await getCurrentPrice(asset, 'crypto');
          return { asset, price };
        } catch (error) {
          console.error(`Error fetching price for ${asset}:`, error);
          return { asset, price: 0 };
        }
      });

      const priceResults = await Promise.all(pricePromises);
      const priceMap: { [key: string]: number } = {};
      priceResults.forEach(({ asset, price }) => {
        priceMap[asset] = price;
      });
      setPrices(priceMap);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: bigint) => {
    try {
      const userAddress = await getPublicKey();
      const success = await cancelOrder(userAddress, orderId);
      
      if (success) {
        toast.success(`Order #${orderId} has been cancelled successfully.`);
        fetchOrders(true);
      } else {
        toast.error("Failed to cancel the order. Please try again.");
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error("An error occurred while cancelling the order.");
    }
  };

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / Math.pow(10, 7)).toFixed(4);
  };

  const formatPrice = (price: bigint | number) => {
    const priceNum = typeof price === 'bigint' ? Number(price) : price;
    return (priceNum / Math.pow(10, 7)).toFixed(2);
  };

  const getOrderTypeIcon = (orderType: OrderType) => {
    switch (orderType) {
      case OrderType.StopLoss:
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case OrderType.TakeProfit:
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case OrderType.TrailingStop:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'executed':
        return <Badge variant="secondary">Executed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateDistance = (currentPrice: number, stopPrice: bigint, orderType: OrderType) => {
    const stopPriceNum = Number(stopPrice) / Math.pow(10, 7);
    const distance = ((currentPrice - stopPriceNum) / currentPrice) * 100;
    
    if (orderType === OrderType.TakeProfit) {
      return -distance; // Invert for take profit
    }
    return distance;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Your Orders</h1>
          <p className="text-muted-foreground mt-2">
            Manage your stop-loss, take-profit, and trailing stop orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Link href="/orders/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first stop-loss order to protect your assets
            </p>
            <Link href="/orders/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Orders ({orders.filter(o => o.status === 'active').length})</CardTitle>
            <CardDescription>
              Total orders: {orders.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stop Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const currentPrice = prices[order.asset] || 0;
                  const distance = calculateDistance(currentPrice, order.stopPrice, order.orderType);
                  
                  return (
                    <TableRow key={order.id.toString()}>
                      <TableCell className="font-mono">#{order.id.toString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getOrderTypeIcon(order.orderType)}
                          <span className="capitalize">
                            {order.orderType.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{order.asset}</TableCell>
                      <TableCell>{formatAmount(order.amount)}</TableCell>
                      <TableCell>${formatPrice(order.stopPrice)}</TableCell>
                      <TableCell>
                        {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {currentPrice > 0 && (
                          <span className={distance > 10 ? 'text-green-500' : distance < 5 ? 'text-red-500' : ''}>
                            {distance.toFixed(2)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {order.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}