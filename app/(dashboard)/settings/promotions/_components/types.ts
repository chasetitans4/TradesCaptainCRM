export interface Promotion {
  id: string;
  name: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_service';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  applicable_services?: string[];
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  is_public: boolean;
  total_savings?: number;
}

export interface PromotionFormData {
  name: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'free_service';
  discount_value: string;
  min_purchase_amount: string;
  max_discount_amount: string;
  applicable_services: string;
  start_date: string;
  end_date: string;
  usage_limit: string;
  is_active: boolean;
  is_public: boolean;
}

export const INITIAL_FORM_DATA: PromotionFormData = {
  name: '',
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase_amount: '',
  max_discount_amount: '',
  applicable_services: '',
  start_date: '',
  end_date: '',
  usage_limit: '',
  is_active: true,
  is_public: false,
};
