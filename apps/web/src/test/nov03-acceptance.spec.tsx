import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {LanguageProvider} from '../lib/i18n';
import {FollowStar} from '../components/MemberSignals';
import {ContactsPage} from '../pages/ContactsPage';
import {InviteUserCards} from '../pages/InviteManagementPage';
import {InviteAssessmentProvider} from '../components/InviteAssessment';
import {UsernameField} from '../components/UsernameField';
const api=vi.hoisted(()=>({getUserSession:vi.fn(()=>({id:'viewer'})),listFollowing:vi.fn(),followUser:vi.fn(),unfollowUser:vi.fn(),getInviteAssessment:vi.fn(),listGuestLists:vi.fn(async()=>[]),listSentEventInvitations:vi.fn(async()=>[]),listSentPlaceInvitations:vi.fn(async()=>[]),importContacts:vi.fn(),inviteEventParticipant:vi.fn(),invitePlaceMember:vi.fn(),checkAvailability:vi.fn(async()=>({usernameAvailable:true}))}));
const providers=vi.hoisted(()=>({pickPhoneContacts:vi.fn(),pickGoogleContacts:vi.fn()}));
vi.mock('../lib/api',async()=>({...await vi.importActual('../lib/api'),...api}));
vi.mock('../lib/socialProviders',()=>providers);
vi.mock('../lib/useGuestListEntitlement',()=>({useGuestListEntitlement:()=>({canUseGuestLists:false})}));
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();api.listFollowing.mockResolvedValue([]);});
function mount(node:React.ReactNode){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter><LanguageProvider>{node}</LanguageProvider></MemoryRouter></QueryClientProvider>);}
it('synchronizes every star for the same member through follow, unfollow and readback',async()=>{
 api.followUser.mockImplementation(async()=>{api.listFollowing.mockResolvedValue([{id:'member'}]);return {ok:true,following:true};});
 api.unfollowUser.mockImplementation(async()=>{api.listFollowing.mockResolvedValue([]);return {ok:true,following:false};});
 mount(<><FollowStar id="member"/><FollowStar id="member"/></>);
 await waitFor(()=>expect(screen.getAllByRole('button')[0]).toBeEnabled());
 fireEvent.click(screen.getAllByRole('button')[0]!);
 await waitFor(()=>expect(screen.getAllByRole('button').every(b=>b.getAttribute('aria-pressed')==='true')).toBe(true));
 await waitFor(()=>expect(screen.getAllByRole('button')[1]).toBeEnabled());
 fireEvent.click(screen.getAllByRole('button')[1]!);
 await waitFor(()=>expect(screen.getAllByRole('button').every(b=>b.getAttribute('aria-pressed')==='false')).toBe(true));
 expect(api.followUser).toHaveBeenCalledTimes(1);expect(api.unfollowUser).toHaveBeenCalledTimes(1);
});
for(const type of ['event','place'] as const) for(const source of ['phone','google'] as const) {
 it(`${type}/${source}: keeps selection in target, deduplicates and sends no invitation during scan`,async()=>{
  providers[source==='phone'?'pickPhoneContacts':'pickGoogleContacts'].mockResolvedValue([{name:'Ada',email:'ada@test.local'},{name:'Ada copy',email:'ada@test.local'}]);
  api.importContacts.mockResolvedValue({matches:[],invitees:[{name:'Ada',email:'ada@test.local'}]});
  mount(<ContactsPage inviteTarget={{type,id:'target',source}}/>);
  expect(screen.queryByText('Manuel arama')).not.toBeInTheDocument();
  expect(screen.queryByText(/kişi davet edildi/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:source==='phone'?/Telefon rehberi/:/Google Contacts/}));
  await screen.findByText('Henüz kimseye davet gönderilmedi.');
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  fireEvent.click(screen.getByRole('checkbox',{name:/Tümünü seç/}));
  fireEvent.click(screen.getByRole('button',{name:'Seçilen kişileri eşleştir'}));
  await screen.findByText('Davet edilebilecek 1 kişi');
  expect(api.importContacts).toHaveBeenCalledWith(source,[{name:'Ada',email:'ada@test.local'}]);
  expect(api.inviteEventParticipant).not.toHaveBeenCalled();expect(api.invitePlaceMember).not.toHaveBeenCalled();
 });
 it(`${type}/${source}: provider rejection stays in target without a success count or manual search`,async()=>{
  providers[source==='phone'?'pickPhoneContacts':'pickGoogleContacts'].mockRejectedValue(new Error('Erişim engellendi'));
  mount(<ContactsPage inviteTarget={{type,id:'target',source}}/>);
  fireEvent.click(screen.getByRole('button',{name:source==='phone'?/Telefon rehberi/:/Google Contacts/}));
  await screen.findByText('Erişim engellendi');
  expect(screen.queryByText('Manuel arama')).not.toBeInTheDocument();expect(api.importContacts).not.toHaveBeenCalled();
 });
}
it('shows numeric compatibility and disables privacy-denied / already-invited members',async()=>{
 api.getInviteAssessment.mockResolvedValue([{id:'a',canInvite:true,eventPartner:45,attendeeCompatibility:25,score:34,reasons:[]},{id:'b',canInvite:false,eventPartner:0,attendeeCompatibility:0,score:0,reasons:[]}]);
 const invite=vi.fn();mount(<InviteAssessmentProvider kind="event" id="event"><InviteUserCards users={[{id:'a',name:'A',username:'a'},{id:'b',name:'B',username:'b'},{id:'c',name:'C',username:'c'}]} invitedUserIds={new Set(['c'])} pending={false} guestLists={[]} onInvite={invite} onInviteAll={invite} onAddToGuestList={vi.fn()}/></InviteAssessmentProvider>);
 await screen.findByText('%45');expect(screen.getByText('%25')).toBeInTheDocument();
 expect(screen.getByText('Davet yetkiniz yok').closest('button')).toBeDisabled();
 expect(screen.getByText('Davet edildi').closest('button')).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Tümünü davet et'}));expect(invite).toHaveBeenCalledWith(['a']);
});
it('rejects username spaces and surrounding whitespace before availability lookup',()=>{
 mount(<UsernameField initialValue="ada"/>);const input=screen.getByRole('textbox') as HTMLInputElement;
 for(const value of ['ada lovelace',' ada','ada ']){fireEvent.change(input,{target:{value}});expect(input.checkValidity(), value).toBe(false);}
 expect(api.checkAvailability).not.toHaveBeenCalled();
});
