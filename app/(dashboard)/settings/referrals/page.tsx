'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Copy,
  Check,
  MoreHorizontal,
  Loader2,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

interface ReferralProgram {
  id: string;
  name: string;
  description?: string;
  referrer_reward_type: 'credit' | 'discount' | 'cash' | 'gift_card';
  referrer_reward_amount: number;
  referee_reward_type: 'credit' | 'discount' | 'percentage';
  referee_reward_amount: number;
  min_purchase_amount?: number;
  is_active: boolean;
  total_referrals?: number;
  total_converted?: number;
  total_rewards_paid?: number;
}

interface Referral {
  id: string;
  referrer_customer_id: string;
  referee_name: string;
  referee_email?: string;
  referee_phone?: string;
  status: 'pending' | 'contacted' | 'converted' | 'expired';
  reward_status: 'pending' | 'approved' | 'paid';
  created_at: string;
  converted_at?: string;
  referrer?: {
    name: string;
    email?: string;
  };
}

export default function ReferralsSettingsPage() {
  const [programs, setPrograms] = useState<ReferralProgram[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<ReferralProgram | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    referrer_reward_type: 'credit' as 'credit' | 'discount' | 'cash' | 'gift_card',
    referrer_reward_amount: '',
    referee_reward_type: 'discount' as 'credit' | 'discount' | 'percentage',
    referee_reward_amount: '',
    min_purchase_amount: '',
    is_active: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [programsRes, referralsRes] = await Promise.all([
        fetch('/api/referrals/programs'),
        fetch('/api/referrals'),
      ]);

      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data.programs || []);
      }

      if (referralsRes.ok) {
        const data = await referralsRes.json();
        setReferrals(data.referrals || []);
      }
    } catch (_error) {
      setError('Failed to load referral data');
      toast({
        title: 'Failed to load referral data',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewProgramDialog = () => {
    setEditingProgram(null);
    setFormData({
      name: '',
      description: '',
      referrer_reward_type: 'credit',
      referrer_reward_amount: '',
      referee_reward_type: 'discount',
      referee_reward_amount: '',
      min_purchase_amount: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (program: ReferralProgram) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description || '',
      referrer_reward_type: program.referrer_reward_type,
      referrer_reward_amount: program.referrer_reward_amount.toString(),
      referee_reward_type: program.referee_reward_type,
      referee_reward_amount: program.referee_reward_amount.toString(),
      min_purchase_amount: program.min_purchase_amount?.toString() || '',
      is_active: program.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        referrer_reward_type: formData.referrer_reward_type,
        referrer_reward_amount: parseFloat(formData.referrer_reward_amount),
        referee_reward_type: formData.referee_reward_type,
        referee_reward_amount: parseFloat(formData.referee_reward_amount),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        is_active: formData.is_active,
      };

      const response = await fetch(
        editingProgram
          ? `/api/referrals/programs/${editingProgram.id}`
          : '/api/referrals/programs',
        {
          method: editingProgram ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save program');
      }

      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this referral program?')) return;

    try {
      await fetch(`/api/referrals/programs/${programId}`, { method: 'DELETE' });
      loadData();
    } catch (_error) {
      toast({
        title: 'Failed to delete program',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReferralStatus = async (referralId: string, status: string) => {
    try {
      await fetch(`/api/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (_error) {
      toast({
        title: 'Failed to update referral',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const copyReferralLink = (programId: string) => {
    const link = `${window.location.origin}/refer/${programId}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(programId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getRewardLabel = (type: string, amount: number) => {
    switch (type) {
      case 'credit':
        return `${formatCurrency(amount)} credit`;
      case 'discount':
        return `${formatCurrency(amount)} off`;
      case 'percentage':
        return `${amount}% off`;
      case 'cash':
        return `${formatCurrency(amount)} cash`;
      case 'gift_card':
        return `${formatCurrency(amount)} gift card`;
      default:
        return formatCurrency(amount);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'converted':
        return <Badge className="bg-green-100 text-green-800">Converted</Badge>;
      case 'contacted':
        return <Badge className="bg-blue-100 text-blue-800">Contacted</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter((r) => r.status === 'converted').length;
  const conversionRate = totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0;
  const totalRewardsPaid = programs.reduce((sum, p) => sum + (p.total_rewards_paid || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground">
            Manage your customer referral program and track referrals
          </p>
        </div>
        <Button onClick={openNewProgramDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Program
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{convertedReferrals}</p>
                <p className="text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalRewardsPaid)}</p>
                <p className="text-sm text-muted-foreground">Rewards Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          {programs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No referral programs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a referral program to encourage customers to spread the word
                </p>
                <Button onClick={openNewProgramDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Program
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {programs.map((program) => (
                <Card key={program.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        {!program.is_active && (
                          <Badge variant="secondary" className="mt-1">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyReferralLink(program.id)}>
                            {copiedCode === program.id ? (
                              <Check className="h-4 w-4 mr-2" />
                            ) : (
                              <Copy className="h-4 w-4 mr-2" />
                            )}
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(program)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(program.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {program.description && (
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Referrer Gets
                          </p>
                          <p className="font-medium">
                            {getRewardLabel(
                              program.referrer_reward_type,
                              program.referrer_reward_amount
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            New Customer Gets
                          </p>
                          <p className="font-medium">
                            {getRewardLabel(
                              program.referee_reward_type,
                              program.referee_reward_amount
                            )}
                          </p>
                        </div>
                      </div>

                      {program.min_purchase_amount && (
                        <p className="text-sm text-muted-foreground">
                          Min. purchase: {formatCurrency(program.min_purchase_amount)}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {program.total_referrals || 0} referrals
                          </span>
                          <span className="text-muted-foreground">
                            {program.total_converted || 0} converted
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyReferralLink(program.id)}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          {referrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No referrals yet</h3>
                <p className="text-muted-foreground">
                  Referrals will appear here when customers share your business
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred By</TableHead>
                    <TableHead>New Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referrer?.name || 'Unknown'}</p>
                          {referral.referrer?.email && (
                            <p className="text-sm text-muted-foreground">
                              {referral.referrer.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referee_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {referral.referee_email || referral.referee_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        {new Date(referral.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={referral.status}
                          onValueChange={(value) =>
                            handleUpdateReferralStatus(referral.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? 'Edit Program' : 'Create Referral Program'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Friend Referral Program"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe the referral program..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Referrer Reward (what they get)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={formData.referrer_reward_type}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, referrer_reward_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Account Credit</SelectItem>
                    <SelectItem value="discount">Dollar Discount</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gift_card">Gift Card</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.referrer_reward_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      referrer_reward_amount: e.target.value,
                    }))
                  }
                  placeholder="25.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Customer Reward (what they get)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={formData.referee_reward_type}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, referee_reward_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Account Credit</SelectItem>
                    <SelectItem value="discount">Dollar Discount</SelectItem>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.referee_reward_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      referee_reward_amount: e.target.value,
                    }))
                  }
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_purchase">Minimum Purchase (optional)</Label>
              <Input
                id="min_purchase"
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_purchase_amount: e.target.value,
                  }))
                }
                placeholder="100.00"
              />
              <p className="text-xs text-muted-foreground">
                Minimum purchase required to earn referral reward
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Program is accepting new referrals
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !formData.name ||
                !formData.referrer_reward_amount ||
                !formData.referee_reward_amount
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProgram ? 'Save Changes' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
