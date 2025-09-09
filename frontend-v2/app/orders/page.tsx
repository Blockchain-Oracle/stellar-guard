'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NeonCard } from "@/components/neon-card";
import { CyberButton } from "@/components/cyber-button";
import { GlitchText } from "@/components/glitch-text";
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
  Trash2,
  Clock,
  DollarSign
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
        priceMap[asset] = price ?? 0;
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
        return <Badge variant="default" className="text-xs">Active</Badge>;
      case 'executed':
        return <Badge variant="secondary" className="text-xs">Executed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const calculateDistance = (currentPrice: number, stopPrice: bigint, orderType: OrderType) => {
    const stopPriceNum = Number(stopPrice) / Math.pow(10, 7);
    const distance = ((currentPrice - stopPriceNum) / currentPrice) * 100;
    
    if (orderType === OrderType.TakeProfit) {
      return -distance;
    }
    return distance;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlitchText text="LOADING_ORDERS..." className="text-xl sm:text-2xl text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <GlitchText 
            text="YOUR_ORDERS" 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-1 text-xs sm:text-sm">
            [STOP_LOSS_PROTECTION.EXE]
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/all">
            <CyberButton variant="secondary" size="sm">
              <span className="text-xs sm:text-sm">ALL</span>
            </CyberButton>
          </Link>
          <CyberButton
            variant="secondary"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </CyberButton>
          <Link href="/orders/create">
            <CyberButton size="sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="text-xs sm:text-sm">NEW</span>
            </CyberButton>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <NeonCard variant="orange">
          <div className="p-3 sm:p-4">
            <p className="text-xs text-gray-400 font-mono">ACTIVE</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-400 font-mono">
              {orders.filter(o => o.status === 'active').length}
            </p>
          </div>
        </NeonCard>
        <NeonCard variant="cyan">
          <div className="p-3 sm:p-4">
            <p className="text-xs text-gray-400 font-mono">TOTAL</p>
            <p className="text-lg sm:text-2xl font-bold text-cyan-400 font-mono">
              {orders.length}
            </p>
          </div>
        </NeonCard>
        <NeonCard variant="green">
          <div className="p-3 sm:p-4">
            <p className="text-xs text-gray-400 font-mono">EXECUTED</p>
            <p className="text-lg sm:text-2xl font-bold text-green-400 font-mono">
              {orders.filter(o => o.status === 'executed').length}
            </p>
          </div>
        </NeonCard>
        <NeonCard variant="purple">
          <div className="p-3 sm:p-4">
            <p className="text-xs text-gray-400 font-mono">CANCELLED</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-400 font-mono">
              {orders.filter(o => o.status === 'cancelled').length}
            </p>
          </div>
        </NeonCard>
      </div>

      {orders.length === 0 ? (
        <NeonCard>
          <div className="p-8 sm:p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-300 mb-2">NO_ORDERS_FOUND</h3>
            <p className="text-sm text-gray-400 mb-4">
              Create your first order to protect your assets
            </p>
            <Link href="/orders/create">
              <CyberButton>
                <Plus className="h-4 w-4 mr-2" />
                CREATE_ORDER
              </CyberButton>
            </Link>
          </div>
        </NeonCard>
      ) : (
        <>
          {/* Mobile Cards (visible on small screens) */}
          <div className="block lg:hidden space-y-3">
            {orders.map((order) => {
              const currentPrice = prices[order.asset] || 0;
              const distance = calculateDistance(currentPrice, order.stopPrice, order.orderType);
              
              return (
                <NeonCard key={order.id.toString()} variant={order.status === 'active' ? 'orange' : 'default'}>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getOrderTypeIcon(order.orderType)}
                        <span className="font-mono text-sm">#{order.id.toString()}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Asset</span>
                        <span className="font-mono font-bold">{order.asset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Amount</span>
                        <span className="font-mono">{formatAmount(order.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Stop Price</span>
                        <span className="font-mono text-orange-400">${formatPrice(order.stopPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Current</span>
                        <span className="font-mono">${currentPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Distance</span>
                        <span className={`font-mono text-sm ${
                          Math.abs(distance) < 5 ? 'text-red-400' : 
                          Math.abs(distance) < 10 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    {order.status === 'active' && (
                      <div className="mt-4 pt-3 border-t border-gray-800">
                        <CyberButton
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          CANCEL_ORDER
                        </CyberButton>
                      </div>
                    )}
                  </div>
                </NeonCard>
              );
            })}
          </div>

          {/* Desktop Table (hidden on small screens) */}
          <NeonCard className="hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">TYPE</TableHead>
                    <TableHead className="text-xs">ASSET</TableHead>
                    <TableHead className="text-xs">AMOUNT</TableHead>
                    <TableHead className="text-xs">STOP_PRICE</TableHead>
                    <TableHead className="text-xs">CURRENT</TableHead>
                    <TableHead className="text-xs">DISTANCE</TableHead>
                    <TableHead className="text-xs">STATUS</TableHead>
                    <TableHead className="text-xs">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const currentPrice = prices[order.asset] || 0;
                    const distance = calculateDistance(currentPrice, order.stopPrice, order.orderType);
                    
                    return (
                      <TableRow key={order.id.toString()}>
                        <TableCell className="font-mono text-sm">#{order.id.toString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getOrderTypeIcon(order.orderType)}
                            <span className="capitalize text-sm">
                              {order.orderType.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-sm">{order.asset}</TableCell>
                        <TableCell className="font-mono text-sm">{formatAmount(order.amount)}</TableCell>
                        <TableCell className="font-mono text-sm text-orange-400">${formatPrice(order.stopPrice)}</TableCell>
                        <TableCell className="font-mono text-sm">${currentPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`font-mono text-sm ${
                            Math.abs(distance) < 5 ? 'text-red-400' : 
                            Math.abs(distance) < 10 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.status === 'active' && (
                            <CyberButton
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </CyberButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </NeonCard>
        </>
      )}
    </div>
  );
}