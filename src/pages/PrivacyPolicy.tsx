import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Privacy & Security</h1>
      </div>

      <p className="text-muted-foreground text-lg">
        Your privacy and data security are our top priorities. This policy explains how we collect, use, and protect your information.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Data Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>We collect only the data necessary to provide our services:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Account information (email, name)</li>
              <li>Workflow configurations and agent settings</li>
              <li>Knowledge base documents you upload</li>
              <li>Usage analytics to improve our services</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>End-to-end encryption for data in transit</li>
              <li>Encrypted storage for data at rest</li>
              <li>Regular security audits and updates</li>
              <li>Row Level Security (RLS) for data isolation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Data Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>Your data is used solely for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Providing and improving our AI agent services</li>
              <li>Processing your workflows and knowledge base queries</li>
              <li>Generating analytics and insights for your dashboard</li>
              <li>Technical support and troubleshooting</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access and export your data at any time</li>
              <li>Request deletion of your account and data</li>
              <li>Modify or update your personal information</li>
              <li>Opt-out of non-essential data collection</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Updates to This Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We may update this privacy policy from time to time. We will notify you of any significant changes 
            through the application or via email. Your continued use of Smart Agents Generator after such 
            modifications constitutes your acknowledgment of the modified policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
