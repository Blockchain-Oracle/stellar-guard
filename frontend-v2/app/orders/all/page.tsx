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
  Loader2, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Users,
  Activity
} from "lucide-react";
import Link from "next/link";
import { getAllOrders, StopLossOrder, OrderType } from "@/services/stop-loss";
import { getCurrentPrice } from "@/services/oracle";
import { formatAddress } from "@/lib/stellar";
import toast from "react-hot-toast";

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<StopLossOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState<{ [key: string]: number }>({});
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    uniqueUsers: 0,
    totalVolume: BigInt(0)
  });

  const fetchAllOrders = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      console.log('Fetching all orders from contract...');
      
      const allOrders = await getAllOrders();
      console.log('All orders fetched:', allOrders);
      setOrders(allOrders);

      // Calculate statistics
      const uniqueUsersSet = new Set(allOrders.map(o => o.user));
      const activeOrdersCount = allOrders.filter(o => o.status === 'active').length;
      const totalVolume = allOrders.reduce((sum, o) => sum + o.amount, BigInt(0));
      
      setStats({
        totalOrders: allOrders.length,
        activeOrders: activeOrdersCount,
        uniqueUsers: uniqueUsersSet.size,
        totalVolume
      });

      // Fetch current prices for all unique assets
      const uniqueAssets = [...new Set(allOrders.map(o => o.asset))];
      const pricePromises = uniqueAssets.map(async (asset) => {
        try {
          const price = await getCurrentPrice(asset);
          return { asset, price };
        } catch (error) {
          console.error(`Error fetching price for ${asset}:`, error);
          return { asset, price: 0 };
        }
      });

      const priceResults = await Promise.all(pricePromises);
      const priceMap: { [key: string]: number } = {};
      priceResults.forEach(({ asset, price }) => {
        priceMap[asset] = price ?? 0; // Use 0 as fallback if price is null/undefined
      });
      setPrices(priceMap);
    } catch (error) {
      console.error('Error fetching all orders:', error);
      toast.error("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchAllOrders(), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / Math.pow(10, 7)).toFixed(4);
  };

  const formatPrice = (price: bigint | number) => {
    const priceNum = typeof price === 'bigint' ? Number(price) : price;
    return (priceNum / Math.pow(10, 7)).toFixed(2);
  };

  const formatVolume = (volume: bigint) => {
    const volumeNum = Number(volume) / Math.pow(10, 7);
    if (volumeNum > 1000000) {
      return `${(volumeNum / 1000000).toFixed(2)}M`;
    } else if (volumeNum > 1000) {
      return `${(volumeNum / 1000).toFixed(2)}K`;
    }
    return volumeNum.toFixed(2);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">All Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Complete overview of all stop-loss orders in the contract
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders">
            <Button variant="outline">
              Your Orders
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllOrders(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Orders</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.activeOrders}</p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Unique Users</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Volume</p>
                <p className="text-xl sm:text-2xl font-bold">{formatVolume(stats.totalVolume)}</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Order Book</CardTitle>
          <CardDescription className="text-sm">
            All orders across all users
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-sm sm:text-base text-muted-foreground text-center">
                The contract doesn't have any orders yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stop Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const currentPrice = prices[order.asset] || 0;
                  
                  return (
                    <TableRow key={order.id.toString()}>
                      <TableCell className="font-mono">#{order.id.toString()}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatAddress(order.user)}
                      </TableCell>
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
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}