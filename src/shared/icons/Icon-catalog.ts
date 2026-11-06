import type { ComponentType } from "react";
import CheckIcon from "./CheckIcon";
import DotsIcon from "./DotsIcon";
import CircleMinusIcon from "./CircleMinusIcon";
import CircleDotIcon from "./CircleDotIcon";
import CalendarIcon from "./CalendarIcon";
import SearchIcon from "./SearchIcon";
import PlusIcon from "./PlusIcon";
import TrashIcon from "./TrashIcon";
import ChevronDownIcon from "./ChevronIcon";
import ArrowLeftIcon from "./AtIcon";
import ArrowRightIcon from "./AtIcon";
import StarIcon from "./StarIcon";
import EditIcon from "./EditIcon";
import SettingIcon from "./SettingsIcon";
import InfoIcon from "./InfoIcon";
import ErrorIcon from "./ErrorIcon";
import SuccessIcon from "./SuccessIcon";
import AlertCircleIcon from "./AlertIcon";
import UserIcon from "./UserIcon";
import FolderIcon from "./FolderIcon";
import FileIcon from "./FileIcon";
import BuildingIcon from "./BuildingIcon";
import BriefcaseIcon from "./BriefcaseIcon";
import DashboardIcon from "./Dashboard";
import RelationIcon from "./RelationIcon";
import AdminIcon from "./AdminIcon";
import ActivityIcon from "./ActivityIcon";
import HashIcon from "./HashIcon";
import KeyIcon from "./KeyIcon";
import StackIcon from "./StackIcon";
import TeamsIcon from "./TeamsIcon";
import XIcon from "./XIcon";
import VectorIcon from "./VectorIcon";
import TablerIcon from "./TablerIcon";

export interface IconProps {
  className?: string;
  fill?: boolean;
}

const iconMap: Record<string, ComponentType<IconProps>> = {
  check: CheckIcon,
  dot: DotsIcon,
  "circle-minus": CircleMinusIcon,
  "circle-dot": CircleDotIcon,
  calendar: CalendarIcon,
  search: SearchIcon,
  plus: PlusIcon,
  trash: TrashIcon,
  "chevron-down": ChevronDownIcon,
  "arrow-left": ArrowLeftIcon,
  "arrow-right": ArrowRightIcon,
  star: StarIcon,
  edit: EditIcon,
  setting: SettingIcon,
  info: InfoIcon,
  error: ErrorIcon,
  success: SuccessIcon,
  "alert-circle": AlertCircleIcon,
  user: UserIcon,
  folder: FolderIcon,
  file: FileIcon,
  building: BuildingIcon,
  briefcase: BriefcaseIcon,
  dashboard: DashboardIcon,
  relation: RelationIcon,
  admin: AdminIcon,
  activity: ActivityIcon,
  hash: HashIcon,
  key: KeyIcon,
  stack: StackIcon,
  teams: TeamsIcon,
  x: XIcon,
  vector: VectorIcon,
  tabler: TablerIcon,
};

export const getIcon = (slug?: string | null): ComponentType<IconProps> => {
  return (slug && iconMap[slug]) || CircleDotIcon;
};

export { iconMap };
