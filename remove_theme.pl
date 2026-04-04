#!/usr/bin/perl
use strict;
use warnings;

my @files = qw(
    Resources.html shops.html tier-list.html Locations.html quests.html
    manufacture.html roadmap.html index.html monsters.html Item.html
);

foreach my $file (@files) {
    open(my $fh, '<:encoding(UTF-8)', $file) or die "Cannot open $file: $!";
    my $content = do { local $/; <$fh> };
    close($fh);
    
    my $original = $content;
    
    # 1. Remove CSS: /* Theme Toggle */ comment + .theme-toggle, .theme-toggle-ball, .theme-toggle.light CSS
    $content =~ s{
        \s*/[*]\s*Theme\s+Toggle\s*[*]/\s*
        [.](?:theme-toggle|theme-toggle-ball)\s*[{][^}]*[}]\s*
        [.](?:theme-toggle)[.]light\s+[.](?:theme-toggle-ball)\s*[{][^}]*[}]
    }{}gsx;
    
    # 2. Remove all body.light-mode CSS rules (including multi-property blocks)
    $content =~ s{\n\s*body[.]light-mode\s+(?:[^{]*?)\{(?:[^}]*)\}}{}gs;
    
    # 3. Remove /* Light mode styles - pastel theme */ comment
    $content =~ s{\n\s*/[*]\s*Light mode styles\s*[-–—]?\s*pastel theme\s*[*]/}{}g;
    
    # 4. Remove any remaining .light-mode CSS rules
    $content =~ s{\n\s*[.](?:[a-zA-Z0-9_-]*light-mode[a-zA-Z0-9_-]*)\s*[{][^}]*[}]}{}gs;
    
    # 5. Remove HTML: theme toggle element
    $content =~ s{
        \s*<!--\s*Theme\s+Toggle\s*-->\s*
        <div\s+class="theme-toggle"[^>]*>\s*
        <div\s+class="theme-toggle-ball">\s*
        <i\s+class="fas\s+fa-moon[^"]*"[^>]*>\s*</i>\s*
        </div>\s*
        </div>
    }{}gsx;
    
    # 6. Remove JavaScript: theme toggle script blocks
    $content =~ s{<script>\s*
        //\s*Theme\s+Toggle\s*
        \s*const\s+themeToggle\s*=\s*document[.]getElementById[(]themeToggle[)]\s*;
        \s*const\s+body\s*=\s*document[.]body\s*;
        .*?
        \}\s*\)\s*;
        \s*</script>
    }{}gsx;
    
    # 7. Clean up multiple blank lines (more than 3 newlines)
    $content =~ s{\n{4,}}{\n\n}g;
    
    if ($content ne $original) {
        open(my $wfh, '>:encoding(UTF-8)', $file) or die "Cannot write $file: $!";
        print $wfh $content;
        close($wfh);
        print "Modified: $file\n";
    } else {
        print "No changes: $file\n";
    }
}
