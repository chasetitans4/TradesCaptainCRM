'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CATEGORIES,
  ARTICLES,
  searchArticles,
  getArticlesByCategory,
  getPopularArticles,
  type Article,
} from '@/lib/knowledge-base/articles';
import {
  Search,
  X,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Rocket,
  Users,
  Briefcase,
  MessageSquare,
  FileText,
  Settings,
  CreditCard,
  Bot,
  Phone,
  Mail,
  Calendar,
  Receipt,
  BarChart,
  Plug,
  Smartphone,
  DollarSign,
  UserPlus,
  ExternalLink,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  Ticket,
  Lightbulb,
} from 'lucide-react';

// Icon mapping for categories
const ICON_MAP: Record<string, React.ElementType> = {
  Rocket,
  Users,
  Briefcase,
  MessageSquare,
  FileText,
  Settings,
  CreditCard,
  Bot,
  Calendar,
  Receipt,
  BarChart,
  Plug,
  Smartphone,
  DollarSign,
  UserPlus,
  HelpCircle,
};

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  // Filter articles by search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchArticles(searchQuery);
  }, [searchQuery]);

  // Get popular articles
  const popularArticles = useMemo(() => getPopularArticles(), []);

  // Get selected article
  const currentArticle = useMemo(() => {
    if (!selectedArticle) return null;
    return ARTICLES.find(a => a.id === selectedArticle);
  }, [selectedArticle]);

  // Format article content with basic markdown
  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h3 key={i} className="font-bold text-text mt-4 mb-2 text-base">
            {line.slice(2, -2)}
          </h3>
        );
      }
      // List items with dash
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="ml-4 text-text-muted text-sm list-disc">
            {line.slice(2)}
          </li>
        );
      }
      // Checkbox items
      if (line.startsWith('☐ ')) {
        return (
          <div key={i} className="flex items-center gap-2 ml-4 text-text-muted text-sm py-0.5">
            <span className="w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={i} className="ml-4 text-text-muted text-sm list-decimal">
            {line.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={i} className="text-text-muted text-sm leading-relaxed">
          {line}
        </p>
      );
    });
  };

  // Article detail view
  if (currentArticle) {
    const category = CATEGORIES.find(c => c.id === currentArticle.categoryId);
    const relatedArticles = currentArticle.relatedArticles
      ?.map(id => ARTICLES.find(a => a.id === id))
      .filter((a): a is Article => a !== undefined) || [];

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-primary text-white px-4 py-6">
          <button
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Help Center
          </button>
          <h1 className="text-xl font-bold">{currentArticle.title}</h1>
          {category && (
            <p className="text-white/70 text-sm mt-1">{category.title}</p>
          )}
        </header>

        <div className="px-4 py-6 max-w-3xl mx-auto">
          {/* Summary Card */}
          <div className="card p-4 mb-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-text font-medium">{currentArticle.summary}</p>
          </div>

          {/* Main Content */}
          <div className="card p-6">
            <div className="space-y-1">
              {formatContent(currentArticle.content)}
            </div>

            {/* Related Routes */}
            {currentArticle.relatedRoutes && currentArticle.relatedRoutes.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-medium text-text mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  Go to Related Pages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentArticle.relatedRoutes.map((route) => (
                    <Link
                      key={route}
                      href={route}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {route.replace(/\//g, ' / ').trim()}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium text-text mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Related Articles
                </h4>
                <div className="space-y-2">
                  {relatedArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article.id)}
                      className="w-full flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-text flex-1">{article.title}</span>
                      <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback */}
          <div className="card p-6 mt-4 text-center">
            <p className="text-sm text-text-muted mb-3">Was this article helpful?</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                Yes, thanks!
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <ThumbsDown className="h-4 w-4" />
                Needs improvement
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-8 text-center">
        <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Help Center</h1>
        <p className="text-white/70 mb-6">
          {ARTICLES.length}+ detailed articles to help you succeed
        </p>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <Input
            type="search"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-10 h-12 bg-white text-text"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Search Results */}
        {searchQuery && (
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <div className="card p-8 text-center">
                <HelpCircle className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No articles found for "{searchQuery}"</p>
                <p className="text-sm text-text-muted mt-1">
                  Try different keywords or browse categories below
                </p>
              </div>
            ) : (
              <div className="card divide-y divide-border">
                {searchResults.slice(0, 10).map((article) => {
                  const category = CATEGORIES.find(c => c.id === article.categoryId);
                  return (
                    <button
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article.id);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                    >
                      <BookOpen className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text">{article.title}</p>
                        <p className="text-sm text-text-muted truncate">{article.summary}</p>
                        {category && (
                          <p className="text-xs text-text-muted mt-1">{category.title}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Popular articles (only show when not searching) */}
        {!searchQuery && (
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">Popular Articles</h2>
            <div className="card divide-y divide-border">
              {popularArticles.slice(0, 6).map((article) => {
                const category = CATEGORIES.find(c => c.id === article.categoryId);
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                  >
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text">{article.title}</p>
                      {category && (
                        <p className="text-xs text-text-muted">{category.title}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Categories */}
        {!searchQuery && (
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">Browse by Topic</h2>
            <div className="space-y-3">
              {CATEGORIES.sort((a, b) => a.order - b.order).map((category) => {
                const Icon = ICON_MAP[category.icon] || HelpCircle;
                const isExpanded = expandedCategory === category.id;
                const articles = getArticlesByCategory(category.id);

                return (
                  <div key={category.id} className="card overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedCategory(isExpanded ? null : category.id)
                      }
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text">{category.title}</p>
                        <p className="text-sm text-text-muted">
                          {category.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-muted bg-muted px-2 py-0.5 rounded-full">
                          {articles.length}
                        </span>
                        <ChevronRight
                          className={cn(
                            'h-5 w-5 text-text-muted transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </div>
                    </button>

                    {/* Expanded articles list */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 animate-in slide-in-from-top-2 fade-in duration-200">
                        {articles.slice(0, 8).map((article) => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 pl-16 hover:bg-muted transition-colors text-left"
                          >
                            <BookOpen className="h-4 w-4 text-text-muted shrink-0" />
                            <span className="text-sm text-text flex-1">{article.title}</span>
                            {article.popular && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                Popular
                              </span>
                            )}
                          </button>
                        ))}
                        {articles.length > 8 && (
                          <div className="px-4 py-3 pl-16 text-sm text-text-muted">
                            And {articles.length - 8} more articles...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AI Assistant Promo */}
        {!searchQuery && (
          <section className="card p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/20 flex-shrink-0">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text mb-1">Need More Help?</h3>
                <p className="text-sm text-text-muted mb-3">
                  Our AI assistant can answer your questions, help you navigate the CRM,
                  and even perform actions for you. Click the chat bubble in the bottom right corner!
                </p>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <MessageSquare className="h-4 w-4" />
                  Available 24/7
                </div>
              </div>
            </div>
          </section>
        )}

        {/* My Tickets */}
        <section className="card p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-100">
          <Link href="/support/tickets" className="flex items-center gap-4 group">
            <div className="p-3 rounded-xl bg-blue-100 flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text mb-0.5 group-hover:text-primary transition-colors">My Support Tickets</h3>
              <p className="text-sm text-text-muted">
                View and track your support requests
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary transition-colors" />
          </Link>
        </section>

        {/* Feature Requests */}
        <section className="card p-4 bg-gradient-to-r from-yellow-50 to-orange-50/50 border-yellow-100">
          <Link href="/feature-requests" className="flex items-center gap-4 group">
            <div className="p-3 rounded-xl bg-yellow-100 flex-shrink-0 group-hover:bg-yellow-200 transition-colors">
              <Lightbulb className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text mb-0.5 group-hover:text-primary transition-colors">Feature Requests</h3>
              <p className="text-sm text-text-muted">
                Submit ideas and vote on new features
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary transition-colors" />
          </Link>
        </section>

        {/* Contact support */}
        <section className="card p-6 text-center">
          <h3 className="font-semibold text-text mb-2">Still need help?</h3>
          <p className="text-sm text-text-muted mb-4">
            Our support team is here to assist you
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="mailto:support@tradescaptain.com">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Email Support
              </Button>
            </a>
            <a href="tel:+18001234567">
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Call Us
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
