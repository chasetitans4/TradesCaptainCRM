'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tag,
  Check,
  X,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  DollarSign,
  Users,
  Calendar,
  Percent,
  Bell,
} from 'lucide-react';
import type { Offer, OfferApprovalRequest } from '@/lib/pricing/offers';
import { logger } from '@/lib/logger';
const adminOffersLogger = logger.child({ context: 'admin.offers' });

export default function OfferManagementPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<OfferApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<OfferApprovalRequest | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersRes, approvalsRes] = await Promise.all([
        fetch('/api/pricing/offers'),
        fetch('/api/pricing/offers/approval'),
      ]);

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers || []);
      }

      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setPendingApprovals(data.pending_requests || []);
      }
    } catch (error) {
      adminOffersLogger.error({
        msg: 'Error fetching offers/approvals',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId: string, action: 'approve' | 'deny') => {
    try {
      const response = await fetch('/api/pricing/offers/approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action,
          reviewed_by: 'admin-user', // In production, get from auth
          notes: action === 'deny' ? 'Request denied by manager' : undefined,
        }),
      });

      if (response.ok) {
        fetchData();
        setSelectedApproval(null);
      }
    } catch (error) {
      adminOffersLogger.error({
        msg: 'Error processing approval',
        requestId,
        action,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      percent_first_month: 'First Month %',
      percent_ongoing: 'Ongoing %',
      waive_fee: 'Waive Fee',
      free_trial_days: 'Free Trial',
      percent_annual: 'Annual %',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Tag className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Offer Management</h1>
              <p className="text-sm text-gray-500">Control discounts and promotions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingApprovals.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg">
                <Bell className="h-4 w-4" />
                <span className="font-medium">{pendingApprovals.length} pending</span>
              </div>
            )}
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div className="card overflow-hidden border-yellow-200">
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h2 className="font-semibold text-yellow-900">Pending Approvals ({pendingApprovals.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingApprovals.map(request => (
                <div
                  key={request.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedApproval(request)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-mono font-bold rounded">
                          {request.offer_code}
                        </span>
                        <span className="text-sm text-gray-500">by {request.agent_name}</span>
                      </div>
                      <p className="font-medium text-gray-900">{request.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {request.plan_name} • ${request.original_price}/mo → ${request.discounted_price}/mo
                        <span className="text-red-600 ml-1">(-${request.discount_amount}/mo)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleApproval(request.id, 'deny'); }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleApproval(request.id, 'approve'); }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    <strong>Reason:</strong> {request.reason}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Requested {formatDate(request.requested_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Offers */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b">
            <h2 className="font-semibold text-gray-900">All Offers</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Loading offers...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        offer.is_active ? 'bg-green-100' : 'bg-gray-100'
                      )}>
                        {offer.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-mono font-bold rounded">
                            {offer.code}
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          )}>
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {offer.requires_approval && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900">{offer.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{offer.description}</p>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Percent className="h-4 w-4" />
                            <span>{getDiscountTypeLabel(offer.discount_type)}: {offer.discount_value}{offer.discount_type.includes('percent') ? '%' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{offer.current_uses} uses</span>
                          </div>
                          {offer.max_uses && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <span>Max: {offer.max_uses}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            <strong>Commission Impact:</strong> {offer.commission_impact}
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {offer.applies_to.map(pattern => (
                            <span
                              key={pattern}
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
                            >
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOffer(offer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offer Stacking Rules */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Offer Stacking Rules</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium text-green-700">Can Combine:</p>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  FIRST50 + WAIVE99
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  WAIVE99 + FREETRIAL14
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  WAIVE99 + VIP20
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  FREETRIAL14 + VIP20
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-red-700">Cannot Combine:</p>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  FIRST50 + FREETRIAL14
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  FIRST50 + VIP20
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  ANNUAL15 + any other offer
                </li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Maximum 2 offers per subscription (except ANNUAL15 which is standalone)
          </p>
        </div>
      </div>

      {/* Approval Detail Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Approval Request</h2>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Tag className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="font-bold text-orange-900">{selectedApproval.offer_code}</p>
                  <p className="text-sm text-orange-700">VIP 20% Off Monthly</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Agent</p>
                  <p className="font-medium">{selectedApproval.agent_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-medium">{selectedApproval.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="font-medium">{selectedApproval.plan_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested</p>
                  <p className="font-medium">{formatDate(selectedApproval.requested_at)}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Original Price</span>
                  <span className="font-semibold">${selectedApproval.original_price}/mo</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Discounted Price</span>
                  <span className="font-semibold text-green-600">${selectedApproval.discounted_price}/mo</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Discount Amount</span>
                  <span className="font-bold text-red-600">-${selectedApproval.discount_amount}/mo</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                  <span>Annual Impact</span>
                  <span>-${(selectedApproval.discount_amount * 12).toFixed(2)}/yr</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Agent's Reason</p>
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                  {selectedApproval.reason}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleApproval(selectedApproval.id, 'deny')}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Deny Request
              </Button>
              <Button
                onClick={() => handleApproval(selectedApproval.id, 'approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
