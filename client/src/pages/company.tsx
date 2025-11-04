import { useQuery } from "@tanstack/react-query";
import { Building, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanySettings() {
  const { data: company, isLoading } = useQuery({
    queryKey: ["/api/company"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">Company Settings</h1>
        <p className="text-muted-foreground">
          View and manage company information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="text-lg font-semibold">MIDCAI</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tagline</p>
                  <p className="text-lg">Unfolding Perpetually</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="text-lg">India</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Established</p>
                  <p className="text-lg">{company?.dateOfEstablishment || 'N/A'}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </p>
              <p className="text-sm mt-1">
                906-907, Signature Elite, J 7, Govind Marg<br />
                Nr. Narayan Singh Circle<br />
                Jaipur, Rajasthan - 302004
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </p>
              <a href="tel:+919503118434" className="text-sm text-primary hover:underline">
                +91-9503118434
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </p>
              <a href="mailto:contact@midcai.com" className="text-sm text-primary hover:underline">
                contact@midcai.com
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </p>
              <a href="https://midcai.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                www.midcai.com
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <img 
              src="/attached_assets/Logo Mark_Red_1762253485171.png" 
              alt="MIDCAI Logo" 
              className="h-24 w-24"
            />
            <div>
              <p className="text-sm text-muted-foreground">
                This is the official MIDCAI logo used across all company materials
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
