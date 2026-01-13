import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface CategoryPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  previousPage?: { label: string; path: string };
  nextPage?: { label: string; path: string };
  showManageConnections?: boolean;
  onManageConnections?: () => void;
}

export function CategoryPageLayout({
  title,
  description,
  children,
  previousPage,
  nextPage,
  showManageConnections = true,
  onManageConnections,
}: CategoryPageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/summary">My Plan</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
        {showManageConnections && (
          <Button
            variant="outline"
            onClick={onManageConnections}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            Manage Connections
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-border">
        {previousPage ? (
          <Link
            to={previousPage.path}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{previousPage.label}</span>
          </Link>
        ) : (
          <div />
        )}
        {nextPage ? (
          <Link
            to={nextPage.path}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{nextPage.label}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
