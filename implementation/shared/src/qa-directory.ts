import type { AppRole } from "./roles.ts";

export interface QaRoleAssignmentSpec {
  id: string;
  role: AppRole;
  organizationId: string | null;
  venueSlug: string | null;
  eventId: string | null;
}

export interface QaIdentitySpec {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  preferredCitySlug: string;
  favoriteCategories: string[];
  workspaceHint: string;
  roles: QaRoleAssignmentSpec[];
}

export const SYNTHETIC_QA_IDENTITIES: readonly QaIdentitySpec[] = [
  {
    id: "usr-attendee-demo",
    email: "asha@nightlifez.test",
    phone: "+919876500001",
    fullName: "Asha Rao",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts", "dining"],
    workspaceHint: "/account",
    roles: [{ id: "ra-att-1", role: "attendee", organizationId: null, venueSlug: null, eventId: null }]
  },
  {
    id: "usr-super-admin",
    email: "admin@nightlifez.test",
    phone: "+919876500002",
    fullName: "Nikhil Verma (Platform Admin)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts", "festivals"],
    workspaceHint: "/admin",
    roles: [{ id: "ra-adm-1", role: "platform_super_admin", organizationId: null, venueSlug: null, eventId: null }]
  },
  {
    id: "usr-support-agent",
    email: "support@nightlifez.test",
    phone: "+919876500003",
    fullName: "Riya Menon (Support Agent)",
    preferredCitySlug: "mumbai",
    favoriteCategories: ["comedy"],
    workspaceHint: "/admin",
    roles: [{ id: "ra-sup-1", role: "support_agent", organizationId: null, venueSlug: null, eventId: null }]
  },
  {
    id: "usr-finance-ops",
    email: "finance@nightlifez.test",
    phone: "+919876500004",
    fullName: "Vikram Kulkarni (Finance Ops)",
    preferredCitySlug: "mumbai",
    favoriteCategories: ["festivals"],
    workspaceHint: "/admin",
    roles: [{ id: "ra-fin-1", role: "finance_ops", organizationId: null, venueSlug: null, eventId: null }]
  },
  {
    id: "usr-organiser-owner",
    email: "organiser@nightlifez.test",
    phone: "+919876500005",
    fullName: "Meera Nair (Organiser Owner)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["festivals", "music"],
    workspaceHint: "/organiser",
    roles: [
      { id: "ra-org-1", role: "organiser_owner", organizationId: "org-nightlifez-originals", venueSlug: null, eventId: null },
      { id: "ra-org-2", role: "organiser_admin", organizationId: "org-harbor-collective", venueSlug: null, eventId: null }
    ]
  },
  {
    id: "usr-venue-manager",
    email: "venue@nightlifez.test",
    phone: "+919876500006",
    fullName: "Arjun Shetty (Venue Manager)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts"],
    workspaceHint: "/venue-portal",
    roles: [
      {
        id: "ra-ven-1",
        role: "venue_manager",
        organizationId: "org-nightlifez-originals",
        venueSlug: "skyline-amphitheatre-bengaluru",
        eventId: null
      }
    ]
  },
  {
    id: "usr-checkin-staff",
    email: "staff@nightlifez.test",
    phone: "+919876500007",
    fullName: "Kiran Das (Gate Staff)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts"],
    workspaceHint: "/staff",
    roles: [
      {
        id: "ra-stf-1",
        role: "checkin_staff",
        organizationId: "org-nightlifez-originals",
        venueSlug: "skyline-amphitheatre-bengaluru",
        eventId: "evt-solstice-2026"
      },
      {
        id: "ra-stf-2",
        role: "box_office",
        organizationId: "org-nightlifez-originals",
        venueSlug: "banyan-courtyard-coimbatore",
        eventId: "evt-southern-cipher-2026"
      }
    ]
  },
  {
    id: "usr-platform-ops",
    email: "ops@nightlifez.test",
    phone: "+919876500008",
    fullName: "Siddharth Rao (Platform Ops)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts", "nightlife"],
    workspaceHint: "/admin",
    roles: [{ id: "ra-ops-1", role: "platform_operations", organizationId: null, venueSlug: null, eventId: null }]
  },
  {
    id: "usr-organiser-admin",
    email: "orgadmin@nightlifez.test",
    phone: "+919876500009",
    fullName: "Kavya Desai (Organiser Admin)",
    preferredCitySlug: "mumbai",
    favoriteCategories: ["comedy", "music"],
    workspaceHint: "/organiser",
    roles: [
      {
        id: "ra-oga-1",
        role: "organiser_admin",
        organizationId: "org-harbor-collective",
        venueSlug: null,
        eventId: null
      }
    ]
  },
  {
    id: "usr-event-manager",
    email: "eventmgr@nightlifez.test",
    phone: "+919876500010",
    fullName: "Rohan Kapoor (Event Manager)",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["festivals"],
    workspaceHint: "/organiser",
    roles: [
      {
        id: "ra-evm-1",
        role: "event_manager",
        organizationId: "org-nightlifez-originals",
        venueSlug: "skyline-amphitheatre-bengaluru",
        eventId: "evt-solstice-2026"
      }
    ]
  },
  {
    id: "usr-box-office",
    email: "boxoffice@nightlifez.test",
    phone: "+919876500011",
    fullName: "Ananya Iyer (Box Office)",
    preferredCitySlug: "coimbatore",
    favoriteCategories: ["concerts"],
    workspaceHint: "/staff",
    roles: [
      {
        id: "ra-box-1",
        role: "box_office",
        organizationId: "org-nightlifez-originals",
        venueSlug: "banyan-courtyard-coimbatore",
        eventId: "evt-southern-cipher-2026"
      }
    ]
  }
] as const;

export const SYNTHETIC_QA_PHONES = new Set(SYNTHETIC_QA_IDENTITIES.map((q) => q.phone));
