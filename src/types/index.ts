// Type definitions for Prox Deals system

export interface Deal {
  retailer: string;
  product: string;
  size: string;
  price: number;
  start: string;
  end: string;
  category: string;
}

export interface User {
  name: string;
  email: string;
  preferred_retailers: string[];
}

export interface DealForEmail {
  retailer: string;
  product: string;
  size: string;
  price: number;
  start_date: string;
  end_date: string;
  category: string;
}